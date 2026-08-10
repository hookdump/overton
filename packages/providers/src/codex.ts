/**
 * The Codex provider: the `rate_limits` block inside rollout JSONL.
 *
 * There is no endpoint. Codex writes its server-reported limits into the
 * session transcript on `token_count` events, so the newest such block anywhere
 * under `$CODEX_HOME/sessions` is the account's most recent truth.
 *
 * THE TRAP: `primary` and `secondary` do not denote short and long. The same
 * account has been observed reporting a 5h primary with a weekly secondary, and
 * a weekly primary with nothing else. Everything here sorts by
 * `window_minutes`; the names are never consulted.
 *
 * Second consequence of the source: readings only refresh while a session is
 * active, so an idle account's reading ages. That is correct — a weekly
 * percentage barely moves in an hour — and it is exactly what the freshness
 * state exists to express.
 */

import { open, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  codexSessionsDir,
  readingFreshness,
  toEpoch,
  type AccountConfig,
  type AccountId,
  type Reading,
  type WindowKind,
  type WindowReading,
} from "@overton/core";
import { ProviderError, type Provider, type ProviderContext } from "./types.ts";

/** Anything at or above this is the "week" card, whatever the vendor calls it. */
export const LONG_WINDOW_MINUTES = 24 * 60;

export interface SessionFile {
  path: string;
  mtime: number;
  size: number;
}

export async function listSessionFiles(dir: string): Promise<SessionFile[]> {
  let names: string[];
  try {
    // `recursive` covers both the YYYY/MM/DD layout and a flat sessions dir.
    names = await readdir(dir, { recursive: true });
  } catch {
    return [];
  }
  const out: SessionFile[] = [];
  for (const name of names) {
    if (!name.endsWith(".jsonl")) continue;
    const path = join(dir, name);
    try {
      const st = await stat(path);
      if (!st.isFile()) continue;
      out.push({ path, mtime: Math.floor(st.mtimeMs / 1000), size: st.size });
    } catch {
      continue; // rotated away between readdir and stat
    }
  }
  return out;
}

export async function readTail(file: SessionFile, bytes: number): Promise<string> {
  const start = Math.max(0, file.size - bytes);
  const length = file.size - start;
  if (length <= 0) return "";
  const fh = await open(file.path, "r");
  try {
    const buf = Buffer.alloc(length);
    await fh.read(buf, 0, length, start);
    const text = buf.toString("utf8");
    // A mid-line start yields a truncated first record; drop it rather than
    // relying on JSON.parse to reject it.
    return start > 0 ? text.slice(text.indexOf("\n") + 1) : text;
  } finally {
    await fh.close();
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface RateLimitSnapshot {
  ts: number;
  windows: Partial<Record<WindowKind, WindowReading>>;
  plan?: string;
}

/**
 * `rate_limits` → windows, ordered by LENGTH rather than by key name.
 *
 * A reading carrying only a long window leaves `five_hour` ABSENT. It is not
 * zero: an unknown window and an empty one produce opposite gate decisions.
 */
export function parseRateLimits(rateLimits: unknown): Partial<Record<WindowKind, WindowReading>> {
  const out: Partial<Record<WindowKind, WindowReading>> = {};
  if (!isObject(rateLimits)) return out;

  const raw: Array<{ windowMinutes: number; usedPercent: number; resetsAt: number | null }> = [];
  for (const value of Object.values(rateLimits)) {
    if (!isObject(value)) continue; // plan_type and friends
    const windowMinutes = value.window_minutes;
    const usedPercent = value.used_percent;
    if (typeof windowMinutes !== "number" || !Number.isFinite(windowMinutes) || windowMinutes <= 0) continue;
    if (typeof usedPercent !== "number" || !Number.isFinite(usedPercent)) continue;
    raw.push({
      windowMinutes,
      usedPercent: Math.max(0, Math.min(100, usedPercent)),
      resetsAt: toEpoch(value.resets_at),
    });
  }

  raw.sort((a, b) => a.windowMinutes - b.windowMinutes);
  for (const w of raw) {
    const kind: WindowKind = w.windowMinutes < LONG_WINDOW_MINUTES ? "five_hour" : "seven_day";
    if (out[kind]) continue; // shortest of each class wins
    out[kind] = {
      kind,
      utilizationPct: w.usedPercent,
      resetsAt: w.resetsAt,
      windowSec: Math.round(w.windowMinutes * 60),
    };
  }
  return out;
}

/**
 * Newest `rate_limits` block in a chunk of JSONL.
 *
 * Lines without the substring are skipped before `JSON.parse` — a session file
 * is mostly message content, and parsing all of it to find two numbers is the
 * difference between a poll and a stall.
 */
export function extractRateLimits(text: string, fallbackTs: number): RateLimitSnapshot | null {
  let best: RateLimitSnapshot | null = null;

  for (const line of text.split("\n")) {
    if (!line.includes('"rate_limits"')) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // truncated tail line, or a partial write
    }
    if (!isObject(obj)) continue;

    const payload = isObject(obj.payload) ? obj.payload : null;
    const rateLimits = payload?.rate_limits ?? obj.rate_limits;
    if (!isObject(rateLimits)) continue;

    const windows = parseRateLimits(rateLimits);
    if (Object.keys(windows).length === 0) continue;

    const ts = toEpoch(obj.timestamp) ?? toEpoch(payload?.timestamp) ?? fallbackTs;
    if (best && ts <= best.ts) continue;

    const snapshot: RateLimitSnapshot = { ts, windows };
    const plan = rateLimits.plan_type ?? payload?.plan_type;
    if (typeof plan === "string" && plan !== "") snapshot.plan = plan;
    best = snapshot;
  }

  return best;
}

export interface CodexOptions {
  listSessionFiles(dir: string): Promise<SessionFile[]>;
  readTail(file: SessionFile, bytes: number): Promise<string>;
  /** Newest-modified files to inspect. More than a handful is wasted IO. */
  maxFiles: number;
  tailBytes: number;
}

export class CodexProvider implements Provider {
  readonly id = "codex";
  readonly description = "Codex subscriptions, via rate_limits in rollout JSONL";
  readonly metered = true;

  private readonly opts: CodexOptions;

  constructor(opts: Partial<CodexOptions> = {}) {
    this.opts = {
      listSessionFiles: opts.listSessionFiles ?? listSessionFiles,
      readTail: opts.readTail ?? readTail,
      maxFiles: opts.maxFiles ?? 5,
      tailBytes: opts.tailBytes ?? 256 * 1024,
    };
  }

  async check(_accountId: AccountId, account: AccountConfig): Promise<string[]> {
    if (!account.codex_home) return ["needs `codex_home` (a $CODEX_HOME directory)"];
    const files = await this.opts.listSessionFiles(codexSessionsDir(account.codex_home));
    if (files.length === 0) {
      return [
        `no rollouts under ${codexSessionsDir(account.codex_home)} — ` +
          `run \`codex\` once in that profile so it writes a session`,
      ];
    }
    return [];
  }

  async read(accountId: AccountId, account: AccountConfig, ctx: ProviderContext): Promise<Reading | null> {
    if (!account.codex_home) {
      throw new ProviderError(
        "codex account has no `codex_home`, so there are no rollouts to read",
        "missing",
        false,
      );
    }

    const files = await this.opts.listSessionFiles(codexSessionsDir(account.codex_home));
    if (files.length === 0) return null; // Codex has simply never run here

    const recent = [...files].sort((a, b) => b.mtime - a.mtime).slice(0, this.opts.maxFiles);

    let best: RateLimitSnapshot | null = null;
    for (const file of recent) {
      let text: string;
      try {
        text = await this.opts.readTail(file, this.opts.tailBytes);
      } catch {
        continue;
      }
      const snapshot = extractRateLimits(text, file.mtime);
      if (snapshot && (!best || snapshot.ts > best.ts)) best = snapshot;
    }
    if (!best) return null;

    const reading: Reading = {
      accountId,
      provider: "codex",
      // The event's own timestamp, which may be hours old. Deliberate: the
      // freshness state expresses that, rather than a faked `now`.
      ts: best.ts,
      fetchedAt: ctx.now,
      windows: best.windows,
      freshness: "ok",
    };
    const plan = account.plan ?? best.plan;
    if (plan) reading.plan = plan;
    reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
    return reading;
  }
}
