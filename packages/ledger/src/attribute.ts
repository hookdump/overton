/**
 * Attribution: turning one global percentage into per-project spend.
 *
 * This is the part nobody else has built, and it is built on an admission.
 * The vendor reports ONE number per account. It does not know your projects.
 * So attribution is inferred, and the design has to be honest about that:
 *
 *   INVARIANT: for any interval, SUM(pct_delta) == the observed delta.
 *   We may be wrong about WHO spent it. We are never wrong about how much.
 *
 * Every entry records the method that produced it, so a refusal can be traced
 * back to how much guessing went into it and distrusted appropriately.
 */

import {
  INTERACTIVE,
  tx,
  type AccountId,
  type AttributionMethod,
  type DB,
  type LedgerEntry,
  type ProjectId,
  type WindowKind,
} from "@overton/core";
import { proxyByProject } from "./events.ts";

export interface AttributionInput {
  accountId: AccountId;
  windowKind: WindowKind;
  windowEpochId: string;
  /** Exclusive lower bound, inclusive upper — matches `proxyByProject`. */
  t0: number;
  t1: number;
  /** Percentage points consumed between t0 and t1. Must be > 0. */
  deltaPct: number;
}

export interface Attribution {
  entries: LedgerEntry[];
  method: AttributionMethod;
  /** 0-1: how much of the delta was divided by a real cost signal. */
  confidence: number;
}

/** Projects with a claim open during the interval — the no-proxy fallback. */
function activeProjects(db: DB, accountId: AccountId, t0: number, t1: number): ProjectId[] {
  return db
    .query<{ project_id: string }, [string, number, number]>(
      `SELECT DISTINCT project_id FROM claims
       WHERE account_id = ? AND opened_at <= ? AND (closed_at IS NULL OR closed_at >= ?)`,
    )
    .all(accountId, t1, t0)
    .map((r) => r.project_id);
}

/**
 * Divide `deltaPct` across projects, in order of preference:
 *
 *   weighted  several projects with a usable cost proxy — the normal case
 *   sole      exactly one candidate, so there is no inference at all
 *   equal     several claims, no proxy — split evenly and flag it
 *   residual  nothing was claimed and nothing was measured → @interactive
 */
export function attribute(db: DB, input: AttributionInput): Attribution {
  const { accountId, windowKind, windowEpochId, t0, t1, deltaPct } = input;
  if (!(deltaPct > 0)) return { entries: [], method: "residual", confidence: 1 };

  const buckets = proxyByProject(db, accountId, t0, t1).filter((b) => b.outputTokens > 0);
  const totalProxy = buckets.reduce((s, b) => s + b.outputTokens, 0);

  let method: AttributionMethod;
  let weights: Array<{ projectId: string; weight: number; proxy: number }>;

  if (totalProxy > 0) {
    weights = buckets.map((b) => ({
      projectId: b.projectId,
      weight: b.outputTokens / totalProxy,
      proxy: b.outputTokens,
    }));
    method = weights.length === 1 ? "sole" : "weighted";
  } else {
    const active = activeProjects(db, accountId, t0, t1);
    if (active.length === 1) {
      weights = [{ projectId: active[0]!, weight: 1, proxy: 0 }];
      method = "sole";
    } else if (active.length > 1) {
      // No cost signal to divide by. An even split is a guess, and it is
      // LABELLED as one so a refusal built on it can be distrusted properly.
      weights = active.map((p) => ({ projectId: p, weight: 1 / active.length, proxy: 0 }));
      method = "equal";
    } else {
      // Nothing of ours was running. This is your own terminal work, and
      // counting it here is what keeps the residual bucket honest instead of
      // inflating whichever project happened to be open.
      weights = [{ projectId: INTERACTIVE, weight: 1, proxy: 0 }];
      method = "residual";
    }
  }

  const entries: LedgerEntry[] = weights.map((w) => ({
    accountId,
    windowKind,
    windowEpochId,
    projectId: w.projectId,
    pctDelta: round6(deltaPct * w.weight),
    costProxy: w.proxy,
    method,
    ts: t1,
  }));

  // The last entry absorbs the remainder EXACTLY — assigned `delta − sum(others)`
  // rather than nudged and re-rounded. Rounding the correction leaves up to
  // 5e-7 per interval unaccounted for: meaningless once, and a slow leak in the
  // one number this system promises is never wrong.
  if (entries.length > 0) {
    const others = entries.slice(0, -1).reduce((s, e) => s + e.pctDelta, 0);
    entries[entries.length - 1]!.pctDelta = deltaPct - others;
  }

  const confidence =
    method === "weighted" || method === "sole" ? (totalProxy > 0 ? 1 : 0.6) : method === "equal" ? 0.3 : 1;
  return { entries, method, confidence };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Persist attribution for an interval.
 *
 * Idempotent on (account, window, epoch, project, interval_start): re-running
 * attribution for the same interval replaces rather than doubles, so a re-scan
 * after a crash is safe.
 */
export function saveAttribution(db: DB, entries: LedgerEntry[], intervalStart: number): void {
  if (!entries.length) return;
  const ins = db.query(
    `INSERT INTO ledger
       (account_id, window_kind, window_epoch_id, project_id, pct_delta, cost_proxy, method, interval_start, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(account_id, window_kind, window_epoch_id, project_id, interval_start)
     DO UPDATE SET pct_delta = excluded.pct_delta, cost_proxy = excluded.cost_proxy,
                   method = excluded.method, ts = excluded.ts`,
  );
  tx(db, () => {
    for (const e of entries) {
      ins.run(
        e.accountId,
        e.windowKind,
        e.windowEpochId,
        e.projectId,
        e.pctDelta,
        e.costProxy,
        e.method,
        intervalStart,
        e.ts,
      );
    }
  });
}
