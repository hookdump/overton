/**
 * Cost proxy from Codex rollouts.
 *
 * Codex writes one JSONL rollout per session under
 * `$CODEX_HOME/sessions/YYYY/MM/DD/rollout-*.jsonl`. `token_count` events carry
 * both a running total and the last request's usage.
 *
 * The DELTA BETWEEN RUNNING TOTALS is preferred over `last_token_usage`: a
 * `token_count` event that repeats without a new request then contributes a
 * clean zero, where trusting `last_token_usage` outright would count that
 * request twice.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  codexSessionsDir,
  toEpoch,
  type AccountConfig,
  type AccountId,
  type CostEvent,
  type DB,
} from "@overton/core";
import { readCursor, tailJsonl } from "./scan.ts";
import type { CostSource, ScanResult } from "./types.ts";

/**
 * @param carried the last running total seen for this file, so a resumed read
 *        continues the delta instead of charging the whole session again.
 */
export function parseCodexLines(
  accountId: AccountId,
  sessionPath: string,
  lines: string[],
  carried?: { output: number; input: number },
): { events: CostEvent[]; total: { output: number; input: number } | undefined } {
  const events: CostEvent[] = [];
  let prev = carried;
  let cwd: string | undefined;
  let model: string | undefined;

  for (const line of lines) {
    if (!line.includes('"token_count"') && !line.includes('"cwd"')) continue;
    let d: any;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    const p = d?.payload;
    if (!p || typeof p !== "object") continue;

    if (d.type === "session_meta" || p.type === "session_meta") {
      if (p.cwd) cwd = String(p.cwd);
      continue;
    }
    if (d.type === "turn_context" || p.type === "turn_context") {
      if (p.cwd) cwd = String(p.cwd);
      if (p.model) model = String(p.model);
      continue;
    }
    if (p.type !== "token_count") continue;

    const ts = toEpoch(d.timestamp);
    if (ts == null) continue;
    const total = p.info?.total_token_usage;
    if (!total) continue;

    const curr = {
      output: Number(total.output_tokens ?? 0) || 0,
      input: Number(total.input_tokens ?? 0) || 0,
    };
    let outDelta = curr.output;
    let inDelta = curr.input;
    if (prev) {
      outDelta = curr.output - prev.output;
      inDelta = curr.input - prev.input;
    }
    prev = curr;
    // A repeated event with no new request contributes nothing. A NEGATIVE
    // delta means the session restarted its counter; charge nothing rather than
    // a negative, which would credit the project for spending.
    if (outDelta <= 0 && inDelta <= 0) continue;

    events.push({
      accountId,
      source: "codex-rollout",
      sessionPath,
      // CONTENT-DERIVED, not position-derived.
      //
      // An index within this parse shifts the moment the read window slides,
      // and the primary key then stops deduping — measured, a 9.7 MiB rollout
      // re-inserted its ENTIRE history on every tick, so its project's proxy
      // grew without bound and every other project on the account was charged
      // almost nothing.
      eventKey: `${ts}:${curr.output}:${curr.input}`,
      ts,
      outputTokens: Math.max(0, outDelta),
      inputTokens: Math.max(0, inDelta),
      model,
      cwd,
    });
  }
  return { events, total: prev };
}

export function codexSessionFiles(account: AccountConfig, sinceMtime = 0): string[] {
  if (!account.codex_home) return [];
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 4) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name.endsWith(".jsonl")) {
        try {
          if (statSync(p).mtimeMs / 1000 >= sinceMtime) out.push(p);
        } catch {
          /* raced */
        }
      }
    }
  };
  walk(codexSessionsDir(account.codex_home), 0);
  return out;
}

export class CodexCostSource implements CostSource {
  readonly id = "codex-rollout";
  readonly description = "Output tokens from Codex session rollouts";

  supports(account: AccountConfig): boolean {
    return !!account.codex_home;
  }

  /**
   * Rollouts are parsed WHOLE, not tailed.
   *
   * The delta between running totals only makes sense from a known previous
   * total; resuming mid-file without it would charge the entire session again.
   * Rollouts are small, the event key is deterministic given a full parse, and
   * the primary key makes re-insertion a no-op — so correctness costs a few
   * kilobytes of re-reading. The cursor is still advanced, purely so the
   * `sinceMtime` filter can skip files that have not changed at all.
   */
  scan(db: DB, accountId: AccountId, account: AccountConfig, sinceMtime = 0): ScanResult {
    const events: CostEvent[] = [];
    const cursors = [];
    for (const path of codexSessionFiles(account, sinceMtime)) {
      const prev = readCursor(db, path);
      const full = tailJsonl(path, null, Number.POSITIVE_INFINITY);
      if (!full) continue;
      if (prev && prev.size === full.cursor.size && prev.mtime === full.cursor.mtime) continue;
      events.push(...parseCodexLines(accountId, path, full.lines).events);
      cursors.push(full.cursor);
    }
    return { events, cursors };
  }
}
