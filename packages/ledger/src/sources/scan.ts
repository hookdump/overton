/**
 * Incremental JSONL scanning.
 *
 * Transcripts are append-only, so a byte offset is a valid resume point and
 * re-reading a week of history on every tick is unnecessary. The cursor is
 * advanced only after the events it covers are committed, so a crash re-reads a
 * tail rather than losing it.
 */

import { closeSync, openSync, readSync, statSync } from "node:fs";
import type { DB } from "@overton/core";

export interface ScanCursor {
  path: string;
  size: number;
  mtime: number;
  offset: number;
}

export function readCursor(db: DB, path: string): ScanCursor | null {
  return (
    db
      .query<ScanCursor, [string]>("SELECT path, size, mtime, offset FROM scan_state WHERE path = ?")
      .get(path) ?? null
  );
}

export function writeCursor(db: DB, accountId: string, c: ScanCursor, now: number): void {
  db.query(
    `INSERT INTO scan_state (path, account_id, size, mtime, offset, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(path) DO UPDATE SET
       size = excluded.size, mtime = excluded.mtime,
       offset = excluded.offset, scanned_at = excluded.scanned_at`,
  ).run(c.path, accountId, c.size, c.mtime, c.offset, now);
}

export interface TailResult {
  lines: string[];
  cursor: ScanCursor;
}

/**
 * Read whatever is new in a JSONL file since the cursor.
 *
 * A file that SHRANK was rotated or rewritten, so the offset is meaningless and
 * we start over — trusting a stale offset there skips real events and
 * under-reports a project's spend, which fails in the direction that hands out
 * capacity nobody paid for.
 */
export function tailJsonl(
  path: string,
  prev: ScanCursor | null,
  maxBytes = 8 * 1024 * 1024,
): TailResult | null {
  let st;
  try {
    st = statSync(path);
  } catch {
    return null;
  }
  const size = st.size;
  const mtime = Math.floor(st.mtimeMs / 1000);
  let offset = prev?.offset ?? 0;
  if (prev && size < prev.size) offset = 0;
  if (offset >= size) return { lines: [], cursor: { path, size, mtime, offset } };

  // A very large backlog is read from the END: the ledger cares about recent
  // intervals, and a first-run scan of a year of transcripts would stall a tick.
  if (size - offset > maxBytes) offset = size - maxBytes;

  const fd = openSync(path, "r");
  try {
    const len = size - offset;
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, offset);
    const text = buf.toString("utf8");
    // Keep the trailing partial line for next time rather than parsing half a
    // record.
    const lastNl = text.lastIndexOf("\n");
    if (lastNl < 0) return { lines: [], cursor: { path, size, mtime, offset } };
    const consumed = Buffer.byteLength(text.slice(0, lastNl + 1), "utf8");
    const lines = text
      .slice(0, lastNl)
      .split("\n")
      .filter((l) => l.length > 0);
    return { lines, cursor: { path, size, mtime, offset: offset + consumed } };
  } finally {
    closeSync(fd);
  }
}
