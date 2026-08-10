/**
 * The Anthropic provider: `GET /api/oauth/usage`, the server-side authority for
 * a Claude subscription's windows.
 *
 * Two things about this endpoint are not obvious and both cost a day to
 * rediscover:
 *
 *  1. All three headers are mandatory. Without `User-Agent: claude-code/<v>`
 *     the request lands in an aggressively rate-limited bucket and returns
 *     persistent 429s that look exactly like real quota exhaustion.
 *     `buildHeaders` is the only way to construct the set, so the UA cannot be
 *     forgotten by a future caller.
 *  2. The response is richer than the documented keys. The top-level
 *     `five_hour` / `seven_day*` keys are the stable contract and are the
 *     primary source; `limits[]` is undocumented, will change shape, and is
 *     therefore parsed defensively and may never throw.
 *
 * The endpoint is undocumented. Treat a schema change as expected: this
 * provider degrades to "no reading", never to a wrong number.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  FIVE_HOURS,
  WEEK,
  readingFreshness,
  toEpoch,
  type AccountConfig,
  type AccountId,
  type Reading,
  type WindowKind,
  type WindowReading,
} from "@overton/core";
import { ProviderError, type Provider, type ProviderContext } from "./types.ts";
import { readClaudeToken } from "./credentials.ts";

const execFileAsync = promisify(execFile);

export const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
export const OAUTH_BETA = "oauth-2025-04-20";
/** Used when the `claude` binary is not on PATH — a headless host, typically. */
export const FALLBACK_CLAUDE_VERSION = "2.0.0";
const DEFAULT_TIMEOUT_MS = 10_000;

/** `2.0.13 (Claude Code)` → `2.0.13`. Anything unrecognisable → the fallback. */
export function parseClaudeVersion(stdout: string): string {
  const m = /\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/.exec(stdout ?? "");
  return m ? m[0] : FALLBACK_CLAUDE_VERSION;
}

/**
 * The only constructor for this request's headers. Every field is filled from
 * arguments that have defaults, so a caller cannot produce a header set missing
 * the User-Agent — see the note at the top of this file.
 */
export function buildHeaders(token: string, version: string): Record<string, string> {
  const v = version && version.trim() !== "" ? version.trim() : FALLBACK_CLAUDE_VERSION;
  return {
    Authorization: `Bearer ${token}`,
    "anthropic-beta": OAUTH_BETA,
    "User-Agent": `claude-code/${v}`,
  };
}

const TOP_LEVEL: ReadonlyArray<{ key: string; kind: WindowKind; windowSec: number }> = [
  { key: "five_hour", kind: "five_hour", windowSec: FIVE_HOURS },
  { key: "seven_day", kind: "seven_day", windowSec: WEEK },
  { key: "seven_day_opus", kind: "seven_day_opus", windowSec: WEEK },
  { key: "seven_day_sonnet", kind: "seven_day_sonnet", windowSec: WEEK },
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pct(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, v));
}

/** A model display name from `limits[].scope` → the per-model weekly window. */
export function modelWindowKind(displayName: unknown): WindowKind | null {
  if (typeof displayName !== "string") return null;
  const n = displayName.toLowerCase();
  if (n.includes("opus")) return "seven_day_opus";
  if (n.includes("sonnet")) return "seven_day_sonnet";
  // Anything else has no well-known kind yet. Ignored, not an error.
  return null;
}

/**
 * `limits[]` is undocumented and volatile, so every access is guarded and the
 * whole pass is best-effort: a shape change here degrades the reading, it never
 * fails the poll. It only ever FILLS windows the stable top-level keys omitted.
 */
export function parseLimits(limits: unknown): Partial<Record<WindowKind, WindowReading>> {
  const out: Partial<Record<WindowKind, WindowReading>> = {};
  if (!Array.isArray(limits)) return out;

  for (const entry of limits) {
    try {
      if (!isObject(entry)) continue;
      const utilization = pct(entry.percent);
      if (utilization == null) continue;

      let kind: WindowKind | null = null;
      let windowSec = WEEK;
      if (entry.kind === "session") {
        kind = "five_hour";
        windowSec = FIVE_HOURS;
      } else if (entry.kind === "weekly_all") {
        kind = "seven_day";
      } else if (entry.kind === "weekly_scoped") {
        const scope = isObject(entry.scope) ? entry.scope : null;
        const model = scope && isObject(scope.model) ? scope.model : null;
        kind = modelWindowKind(model?.display_name);
      }
      if (!kind || out[kind]) continue;

      out[kind] = { kind, utilizationPct: utilization, resetsAt: toEpoch(entry.resets_at), windowSec };
    } catch {
      // One malformed entry must not cost us the other windows.
      continue;
    }
  }
  return out;
}

/**
 * Body → Reading. Exported so the parse can be tested against a captured
 * payload with no network stub.
 *
 * @throws ProviderError('schema') when neither source yields a single window,
 *         which is a schema break rather than an empty account.
 */
export function parseUsage(
  body: unknown,
  accountId: AccountId,
  ctx: Pick<ProviderContext, "now" | "freshness">,
  plan?: string,
): Reading {
  const windows: Partial<Record<WindowKind, WindowReading>> = {};

  if (isObject(body)) {
    for (const { key, kind, windowSec } of TOP_LEVEL) {
      const raw = body[key];
      if (!isObject(raw)) continue; // `null` is a real answer: no such window
      const utilization = pct(raw.utilization);
      if (utilization == null) continue;
      windows[kind] = { kind, utilizationPct: utilization, resetsAt: toEpoch(raw.resets_at), windowSec };
    }
    for (const [kind, w] of Object.entries(parseLimits(body.limits))) {
      if (!windows[kind]) windows[kind] = w;
    }
  }

  if (Object.keys(windows).length === 0) {
    throw new ProviderError(
      "oauth/usage returned no recognisable window — five_hour/seven_day are absent and limits[] was unusable",
      "schema",
      false,
    );
  }

  const reading: Reading = {
    accountId,
    provider: "anthropic",
    // Server-side and computed at request time, so `ts` is `now`.
    ts: ctx.now,
    fetchedAt: ctx.now,
    windows,
    freshness: "ok",
  };
  if (plan) reading.plan = plan;
  reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
  return reading;
}

export interface AnthropicOptions {
  readToken: typeof readClaudeToken;
  claudeVersion(): Promise<string>;
  timeoutMs: number;
}

export class AnthropicProvider implements Provider {
  readonly id = "anthropic";
  readonly description = "Claude subscriptions, via the OAuth usage endpoint";
  readonly metered = true;

  private readonly opts: AnthropicOptions;
  private version: Promise<string> | null = null;

  constructor(opts: Partial<AnthropicOptions> = {}) {
    this.opts = {
      readToken: opts.readToken ?? readClaudeToken,
      claudeVersion:
        opts.claudeVersion ??
        (async () => (await execFileAsync("claude", ["--version"], { timeout: 5000 })).stdout),
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  async check(_accountId: AccountId, account: AccountConfig, ctx: ProviderContext): Promise<string[]> {
    if (!account.config_dir && !account.oauth_token_env) {
      return ["needs `config_dir` (a Claude profile directory) or `oauth_token_env`"];
    }
    try {
      await this.opts.readToken(account, { env: ctx.env });
      return [];
    } catch (e) {
      return [(e as Error).message];
    }
  }

  /** Memoised for the process lifetime; the binary does not change under us. */
  private resolveVersion(): Promise<string> {
    this.version ??= this.opts
      .claudeVersion()
      .then(parseClaudeVersion)
      .catch(() => FALLBACK_CLAUDE_VERSION);
    return this.version;
  }

  async read(accountId: AccountId, account: AccountConfig, ctx: ProviderContext): Promise<Reading | null> {
    const [token, version] = await Promise.all([
      this.opts.readToken(account, { env: ctx.env }),
      this.resolveVersion(),
    ]);

    let res: Response;
    try {
      res = await ctx.fetch(USAGE_URL, {
        method: "GET",
        headers: buildHeaders(token.token, version),
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      });
    } catch (e) {
      // Network, DNS, or our own timeout. Never carries the token.
      throw new ProviderError(`oauth/usage unreachable: ${(e as Error).name}`, "transport", true);
    }

    if (!res.ok) throw statusError(res.status);

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ProviderError("oauth/usage returned a body that is not JSON", "schema", false);
    }

    return parseUsage(body, accountId, ctx, account.plan ?? token.subscriptionType);
  }
}

function statusError(status: number): ProviderError {
  if (status === 401 || status === 403) {
    // Retrying will not produce a token. Re-auth is a human action.
    return new ProviderError(
      `oauth/usage rejected the token (HTTP ${status}) — run \`claude\` in that profile to re-authenticate`,
      "auth",
      false,
    );
  }
  if (status === 429) return new ProviderError("oauth/usage rate-limited (HTTP 429)", "ratelimited", true);
  if (status >= 500) return new ProviderError(`oauth/usage server error (HTTP ${status})`, "transport", true);
  return new ProviderError(`oauth/usage returned HTTP ${status}`, "transport", false);
}
