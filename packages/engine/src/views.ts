/**
 * Views: the shapes every surface renders.
 *
 * Defined once so the CLI, the HTTP API and the MCP server cannot drift apart.
 * A deck that says "on pace" while dispatch refuses is the instrument
 * contradicting the thing it measures, and the only reliable cure is for both
 * to read the same value.
 */

import {
  GATED_WINDOWS,
  elapsedFraction,
  expandHome,
  humanDuration,
  paceState,
  paceText,
  type Freshness,
  type WindowKind,
} from "@overton/core";
import { currentEpoch, ledgerBreakdown, ledgerTotal } from "@overton/ledger";
import type { Overton } from "./overton.ts";
import { openClaims } from "./claims.ts";

export interface WindowView {
  kind: string;
  utilizationPct: number;
  resetsAt: number | null;
  resetsIn: string | null;
  /** The vendor's nominal length. A Codex "weekly" may not be seven days. */
  windowSec: number;
  /**
   * How much of the window has passed, 0-100.
   *
   * Utilization alone is not a reading anyone can act on: 50% used is alarming
   * at 20% elapsed and comfortable at 90%. Every surface that shows a
   * utilization figure needs the clock beside it, so it is derived HERE with
   * the same `elapsedFraction` the allocator paces with rather than
   * reconstructed downstream from a window length the vendor may not use.
   *
   * A window with no reset instant has no elapsed fraction — this reports the
   * allocator's own missing-data value, 0, and `resetsAt: null` is what tells
   * a renderer to say "unknown" instead of "0%".
   */
  elapsedPct: number;
  freshness: Freshness;
}

export interface AccountView {
  accountId: string;
  provider: string;
  plan: string | null;
  metered: boolean;
  enabled: boolean;
  readingAgeSec: number | null;
  windows: WindowView[];
  claims: number;
  maxConcurrent: number;
  /**
   * Where this account's credentials live.
   *
   * Exposed so a client can pin the same seat it just gated on, instead of
   * asking a human to retype a path they already told Overton. Gating on one
   * subscription and spending from another is silent and makes every number
   * downstream wrong, so removing the opportunity to mistype it is worth more
   * than keeping a filesystem path out of a loopback response.
   */
  configDir: string | null;
  codexHome: string | null;
  /** Points of the weekly window that agents may use in total. */
  dispatchable: number;
  /** Attributed so far this epoch, across every project. */
  attributed: number;
  error?: string;
}

export interface ProjectAccountView {
  accountId: string;
  sharePct: number;
  alloc: number;
  used: number;
  allowance: number;
  elapsedPct: number;
  pace: string;
  over: boolean;
  verdict: string;
  retryAfterSec: number | null;
}

export interface ProjectView {
  projectId: string;
  accounts: ProjectAccountView[];
}

export function accountViews(o: Overton): AccountView[] {
  const now = o.clock();
  const out: AccountView[] = [];
  for (const [accountId, account] of Object.entries(o.cfg.accounts)) {
    const reading = o.latestReading(accountId);
    const provider = o.providers.find(account.provider);
    const epoch = currentEpoch(o.db, accountId, "seven_day");
    out.push({
      accountId,
      provider: account.provider,
      plan: reading?.plan ?? account.plan ?? null,
      metered: provider?.metered ?? true,
      enabled: account.enabled,
      readingAgeSec: reading ? now - reading.ts : null,
      windows: Object.values(reading?.windows ?? {})
        .filter((w) => !!w)
        .map((w) => ({
          kind: w!.kind,
          utilizationPct: w!.utilizationPct,
          resetsAt: w!.resetsAt,
          resetsIn: w!.resetsAt != null ? humanDuration(w!.resetsAt - now) : null,
          windowSec: w!.windowSec,
          elapsedPct: w!.resetsAt == null ? 0 : elapsedFraction(w!.resetsAt, w!.windowSec, now) * 100,
          freshness: reading!.freshness,
        })),
      claims: openClaims(o.db, accountId).length,
      maxConcurrent: account.max_concurrent,
      // EXPANDED. A client puts this straight into CLAUDE_CONFIG_DIR, and an
      // environment variable is not shell-expanded — a literal `~` there points
      // at a directory named "~" inside the process's cwd, which silently
      // becomes a brand new empty profile with no credentials.
      configDir: account.config_dir ? expandHome(account.config_dir) : null,
      codexHome: account.codex_home ? expandHome(account.codex_home) : null,
      dispatchable: Math.max(0, account.weekly_target_pct - account.interactive_reserve_pct),
      attributed: epoch ? ledgerTotal(o.db, accountId, "seven_day", epoch.id) : 0,
    });
  }
  return out;
}

export function projectViews(o: Overton): ProjectView[] {
  const out: ProjectView[] = [];
  for (const [projectId, project] of Object.entries(o.cfg.projects)) {
    if (!project.enabled) continue;
    const accounts: ProjectAccountView[] = [];
    for (const accountId of Object.keys(project.accounts)) {
      if (!o.cfg.accounts[accountId]?.enabled) continue;
      const facts = o.facts(projectId, accountId);
      const decision = o.ask(projectId, accountId, { record: false });
      const weekly = facts.windows.find((w) => w.window === "weekly");
      const used = (weekly?.used ?? 0) + (weekly?.staleAdjustment ?? 0);
      const allowance = weekly?.allowance ?? 0;
      // `over` comes from the same comparison the policy makes — never
      // recomputed here with a display tolerance of its own.
      const over = used > allowance;
      accounts.push({
        accountId,
        sharePct: facts.shares.weekly * 100,
        alloc: weekly?.alloc ?? 0,
        used,
        allowance,
        elapsedPct: (weekly?.elapsed ?? 0) * 100,
        pace: paceText(paceState(used, allowance, over)),
        over,
        verdict: decision.verdict,
        retryAfterSec: decision.retryAfterSec,
      });
    }
    out.push({ projectId, accounts });
  }
  return out;
}

export interface LedgerView {
  accountId: string;
  windowKind: string;
  epochId: string | null;
  /** The vendor's own number, for comparison with what we attributed. */
  vendorPct: number | null;
  attributed: number;
  rows: Array<{ projectId: string; pct: number; proxy: number; confidencePct: number }>;
}

/**
 * The one comparison that tells you attribution is broken: what the vendor says
 * the account has spent, against the sum of what we charged to projects. They
 * will not match exactly — the ledger starts when Overton does — but a widening
 * gap means a source is being missed.
 */
export function ledgerView(
  o: Overton,
  accountId: string,
  windowKind: WindowKind = GATED_WINDOWS[1],
): LedgerView {
  const epoch = currentEpoch(o.db, accountId, windowKind);
  const reading = o.latestReading(accountId);
  const rows = epoch ? ledgerBreakdown(o.db, accountId, windowKind, epoch.id) : [];
  return {
    accountId,
    windowKind,
    epochId: epoch?.id ?? null,
    vendorPct: reading?.windows[windowKind]?.utilizationPct ?? null,
    attributed: epoch ? ledgerTotal(o.db, accountId, windowKind, epoch.id) : 0,
    rows: rows.map((r) => ({
      projectId: r.projectId,
      pct: r.pct,
      proxy: r.proxy,
      confidencePct: r.entries > 0 ? (r.confident / r.entries) * 100 : 0,
    })),
  };
}
