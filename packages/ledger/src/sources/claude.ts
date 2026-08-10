/**
 * Cost proxy from Claude Code transcripts.
 *
 * Claude Code writes one JSONL per session under
 * `<config_dir>/projects/<slug>/<sessionId>.jsonl`. Assistant records carry
 * `message.usage.output_tokens` and the session's `cwd`.
 *
 * DEDUPLICATION IS BY `requestId`. A single API request is written across
 * several streamed records that each repeat the SAME cumulative usage block.
 * Summing the lines counts one request two to four times — measured 27
 * assistant lines for 10 distinct requests in a live transcript — which
 * inflates whichever project happened to stream the most.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  claudeProjectsDir,
  toEpoch,
  type AccountConfig,
  type AccountId,
  type CostEvent,
  type DB,
} from "@overton/core";
import { readCursor, tailJsonl } from "./scan.ts";
import type { CostSource, ScanResult } from "./types.ts";

export function parseClaudeLines(accountId: AccountId, sessionPath: string, lines: string[]): CostEvent[] {
  const byKey = new Map<string, CostEvent>();
  for (const line of lines) {
    // Cheap pre-filter: most records are user turns and tool results.
    if (!line.includes('"usage"')) continue;
    let d: any;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d?.type !== "assistant") continue;
    const usage = d.message?.usage;
    if (!usage) continue;
    const ts = toEpoch(d.timestamp);
    if (ts == null) continue;

    // requestId first: it is what actually identifies one billed request.
    const key = String(d.requestId ?? d.message?.id ?? d.uuid ?? `${sessionPath}:${ts}`);
    const out = Number(usage.output_tokens ?? 0) || 0;
    const inp =
      (Number(usage.input_tokens ?? 0) || 0) +
      (Number(usage.cache_creation_input_tokens ?? 0) || 0) +
      (Number(usage.cache_read_input_tokens ?? 0) || 0);

    // Last write wins within a request: the records repeat the same block, and
    // the final one is the complete figure if they ever differ.
    byKey.set(key, {
      accountId,
      source: "claude-transcript",
      sessionPath,
      eventKey: key,
      ts,
      outputTokens: out,
      inputTokens: inp,
      model: d.message?.model ?? undefined,
      cwd: d.cwd ?? undefined,
    });
  }
  return [...byKey.values()];
}

export function claudeSessionFiles(account: AccountConfig, sinceMtime = 0): string[] {
  if (!account.config_dir) return [];
  const root = claudeProjectsDir(account.config_dir);
  const out: string[] = [];
  let dirs: string[];
  try {
    dirs = readdirSync(root);
  } catch {
    return [];
  }
  for (const d of dirs) {
    let files: string[];
    try {
      files = readdirSync(join(root, d));
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith(".jsonl")) continue;
      const p = join(root, d, f);
      try {
        if (statSync(p).mtimeMs / 1000 >= sinceMtime) out.push(p);
      } catch {
        /* raced with a delete */
      }
    }
  }
  return out;
}

export class ClaudeCostSource implements CostSource {
  readonly id = "claude-transcript";
  readonly description = "Output tokens from Claude Code session transcripts";

  supports(account: AccountConfig): boolean {
    return !!account.config_dir;
  }

  scan(db: DB, accountId: AccountId, account: AccountConfig, sinceMtime = 0): ScanResult {
    const events: CostEvent[] = [];
    const cursors = [];
    for (const path of claudeSessionFiles(account, sinceMtime)) {
      const tail = tailJsonl(path, readCursor(db, path));
      if (!tail) continue;
      if (tail.lines.length) events.push(...parseClaudeLines(accountId, path, tail.lines));
      cursors.push(tail.cursor);
    }
    return { events, cursors };
  }
}
