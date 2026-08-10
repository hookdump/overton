/**
 * Assembling the facts a policy rules on.
 *
 * Everything that touches the database, the clock or the config happens here,
 * so that policies stay pure. The payoff is that a `Facts` value is a complete,
 * serialisable explanation of a decision: `overton ask --explain` prints one,
 * and a test constructs one by hand.
 */

import {
  GATED_WINDOWS,
  freshnessOf,
  normalisedShare,
  type Config,
  type DB,
  type FreshnessConfig,
  type ProjectId,
  type Reading,
} from "@overton/core";
import { currentEpoch, ledgerUsed, pctPerToken, proxyByProject } from "@overton/ledger";
import {
  allocFor,
  allowanceFor,
  windowKindFor,
  windowSecFor,
  type Facts,
  type GateWindow,
  type WindowFacts,
  type WindowMode,
} from "@overton/policy";
import { countClaims } from "./claims.ts";
import { latestReading } from "./readings.ts";

export interface FactsInput {
  db: DB;
  cfg: Config;
  projectId: ProjectId;
  accountId: string;
  now: number;
  freshness: FreshnessConfig;
  metered: boolean;
  /** Overridable so a caller that already has one avoids a second query. */
  reading?: Reading | null;
}

/**
 * Can this account's burn be observed locally at all?
 *
 * A headless host configured with only `oauth_token_env` has no transcripts on
 * disk, so any burn estimate is structurally zero. That is a statement about
 * our blindness, not about the account, and the reading guard treats it as
 * missing data rather than as "nothing was spent".
 */
export function hasCostSource(cfg: Config, accountId: string): boolean {
  const a = cfg.accounts[accountId];
  if (!a) return false;
  return !!(a.config_dir || a.codex_home);
}

export function buildFacts(input: FactsInput): Facts {
  const { db, cfg, projectId, accountId, now, freshness, metered } = input;
  const account = cfg.accounts[accountId]!;
  const projectAccount = cfg.projects[projectId]?.accounts[accountId] ?? null;
  const reading = input.reading !== undefined ? input.reading : latestReading(db, accountId, now, freshness);

  const shares = {
    weekly: normalisedShare(cfg, projectId, accountId, "weekly"),
    fiveHour: normalisedShare(cfg, projectId, accountId, "five_hour"),
  };

  const windows: WindowFacts[] = [];
  if (metered && projectAccount) {
    for (const window of ["weekly", "five_hour"] as GateWindow[]) {
      const mode: WindowMode = window === "weekly" ? "pace" : projectAccount.five_hour.mode;
      // A project that declared `five_hour: { mode: off }` asked for
      // weekly-only gating. Blocking it on the state of a window it opted out
      // of ignores the instruction it gave.
      if (mode === "off") continue;

      const kind = windowKindFor(window);
      const w = reading?.windows[kind] ?? null;
      // A window the vendor never sends is not a degraded reading. Some plans
      // report only a weekly figure, and treating that absence as `unknown`
      // refuses every request on a healthy account.
      const reported = reading ? !!w : false;
      const epoch = currentEpoch(db, accountId, kind);
      const alloc = allocFor(cfg, projectId, accountId, window);
      const used = epoch ? ledgerUsed(db, accountId, kind, epoch.id, projectId) : 0;
      const wf = freshnessOf(reading, kind, now, freshness);

      const stale = staleAdjustment({
        db,
        cfg,
        projectId,
        accountId,
        now,
        reading,
        kind,
        epochId: epoch?.id ?? null,
        freshness: wf,
        reported,
        hasSource: hasCostSource(cfg, accountId),
      });

      const a =
        mode === "burst"
          ? // No pacing: a flat ceiling. The concurrency half of burst mode is
            // enforced separately, against live claims.
            { allowance: alloc, elapsed: 1 }
          : allowanceFor({
              alloc,
              resetsAt: w?.resetsAt ?? null,
              windowSec: w?.windowSec ?? windowSecFor(window),
              now,
              floorPct: cfg.policy.weekly.floor_pct,
              slackPct: cfg.policy.weekly.slack_pct,
            });

      windows.push({
        window,
        kind,
        reported,
        freshness: wf,
        epochId: epoch?.id ?? null,
        reading: w,
        mode,
        alloc,
        used,
        allowance: a.allowance,
        elapsed: a.elapsed,
        staleAdjustment: stale.points,
        blocked: stale.blocked,
      });
    }
  }

  return {
    now,
    projectId,
    accountId,
    account,
    projectAccount,
    shares,
    metered,
    reading,
    accountPct: reading?.windows.seven_day?.utilizationPct ?? null,
    windows,
    claims: countClaims(db, accountId, projectId),
    hasCostSource: hasCostSource(cfg, accountId),
    policy: cfg.policy,
    alternatives: alternativesFor(db, cfg, projectId, accountId, now, freshness),
  };
}

interface StaleInput {
  db: DB;
  cfg: Config;
  projectId: ProjectId;
  accountId: string;
  now: number;
  reading: Reading | null;
  kind: string;
  epochId: string | null;
  freshness: string;
  reported: boolean;
  hasSource: boolean;
}

/**
 * What a stale reading costs, in points.
 *
 * `stale`: charge this project for what it has spent since the reading, at this
 * account's own MEASURED points-per-token rate. When there is no measured rate
 * yet we cannot convert honestly, so the request is blocked rather than assumed
 * free.
 *
 * The estimate is scoped to THIS project on purpose. An account-wide residual
 * charged to whichever project happens to ask refuses a project that burned
 * nothing because another one did — it fails safe, but it turns one stale
 * reading into a fleet-wide stop, and charging an account-wide residual to a
 * single project is exactly the inference the ledger exists to avoid.
 */
function staleAdjustment(i: StaleInput): { points: number; blocked: string | null } {
  if (!i.reported) return { points: 0, blocked: null };
  if (i.freshness === "ok") return { points: 0, blocked: null };
  if (i.freshness === "expired" || i.freshness === "unknown" || !i.reading) {
    return { points: 0, blocked: `the ${i.kind} reading is ${i.freshness}` };
  }
  if (!i.hasSource) {
    return {
      points: 0,
      blocked: `the ${i.kind} reading is stale and this account has no local transcript source to price the burn`,
    };
  }

  const rate = i.epochId ? pctPerToken(i.db, i.accountId, i.kind, i.epochId) : null;
  const tokens = proxyByProject(i.db, i.accountId, i.reading.ts, i.now)
    .filter((b) => b.projectId === i.projectId)
    .reduce((sum, b) => sum + b.outputTokens, 0);

  if (rate == null) {
    return tokens > 0
      ? {
          points: 0,
          blocked:
            `the reading is stale and ${tokens.toLocaleString()} output tokens have been spent by ` +
            `${i.projectId} since, with no measured rate to price them`,
        }
      : { points: 0, blocked: null };
  }
  return { points: rate * tokens, blocked: null };
}

/** Where else this project could go, for the remedy line. */
function alternativesFor(
  db: DB,
  cfg: Config,
  projectId: ProjectId,
  exclude: string,
  now: number,
  freshness: FreshnessConfig,
): Facts["alternatives"] {
  const out: Facts["alternatives"] = [];
  for (const accountId of Object.keys(cfg.projects[projectId]?.accounts ?? {})) {
    if (accountId === exclude) continue;
    const account = cfg.accounts[accountId];
    if (!account?.enabled) continue;
    const kind = GATED_WINDOWS[1]; // seven_day
    const epoch = currentEpoch(db, accountId, kind);
    void latestReading(db, accountId, now, freshness);
    out.push({
      accountId,
      used: epoch ? ledgerUsed(db, accountId, kind, epoch.id, projectId) : 0,
      alloc: allocFor(cfg, projectId, accountId, "weekly"),
    });
  }
  return out;
}
