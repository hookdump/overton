/**
 * Cost events: persistence, and the per-project rollup attribution divides by.
 */

import { tx, type AccountId, type CostEvent, type DB, type ProjectId } from "@overton/core";
import type { ScanCursor } from "./sources/scan.ts";
import { writeCursor } from "./sources/scan.ts";

export interface ProxyBucket {
  projectId: ProjectId;
  outputTokens: number;
  inputTokens: number;
  events: number;
}

/**
 * Store events and advance cursors in ONE transaction.
 *
 * The ordering matters more than it looks: a cursor advanced outside the
 * transaction that stored its events permanently skips whatever a crash lost,
 * and the loss is silent — the project simply looks cheaper than it was.
 */
export function saveCostEvents(
  db: DB,
  accountId: AccountId,
  events: CostEvent[],
  cursors: ScanCursor[],
  projectFor: (e: CostEvent) => ProjectId,
  now: number,
): number {
  if (!events.length && !cursors.length) return 0;
  const ins = db.query(
    `INSERT INTO cost_events
       (account_id, source, session_path, event_key, ts, output_tokens, input_tokens, model, cwd, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_path, event_key) DO NOTHING`,
  );
  return tx(db, () => {
    let stored = 0;
    for (const e of events) {
      const res = ins.run(
        e.accountId,
        e.source,
        e.sessionPath,
        e.eventKey,
        e.ts,
        e.outputTokens,
        e.inputTokens,
        e.model ?? null,
        e.cwd ?? null,
        projectFor(e),
      );
      stored += res.changes;
    }
    for (const c of cursors) writeCursor(db, accountId, c, now);
    return stored;
  });
}

/**
 * Output tokens per project in `(t0, t1]`.
 *
 * Half-open on the low side so two adjacent intervals never double-count the
 * event sitting exactly on their boundary.
 */
export function proxyByProject(db: DB, accountId: AccountId, t0: number, t1: number): ProxyBucket[] {
  return db
    .query<ProxyBucket, [string, number, number]>(
      `SELECT project_id AS projectId,
              SUM(output_tokens) AS outputTokens,
              SUM(input_tokens)  AS inputTokens,
              COUNT(*)           AS events
       FROM cost_events
       WHERE account_id = ? AND ts > ? AND ts <= ?
       GROUP BY project_id`,
    )
    .all(accountId, t0, t1);
}

/** Newest mtime already scanned for an account, so a rescan can skip old files. */
export function lastScanMtime(db: DB, accountId: AccountId): number {
  return (
    db
      .query<{ n: number | null }, [string]>(
        "SELECT MAX(mtime) AS n FROM scan_state WHERE account_id = ?",
      )
      .get(accountId)?.n ?? 0
  );
}
