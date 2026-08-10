/**
 * Reading the ledger. Every surface asks these questions and no surface may
 * answer them its own way.
 */

import type { AccountId, DB, ProjectId, WindowKind } from "@overton/core";

/** Percentage points attributed to one project in the current window epoch. */
export function ledgerUsed(
  db: DB,
  accountId: AccountId,
  windowKind: WindowKind,
  epochId: string,
  projectId: ProjectId,
): number {
  return (
    db
      .query<{ n: number | null }, [string, string, string, string]>(
        `SELECT SUM(pct_delta) AS n FROM ledger
         WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ? AND project_id = ?`,
      )
      .get(accountId, windowKind, epochId, projectId)?.n ?? 0
  );
}

export interface LedgerRow {
  projectId: string;
  pct: number;
  proxy: number;
  entries: number;
  /** How many of those entries came from a method involving no guessing. */
  confident: number;
}

/** The whole epoch's split. */
export function ledgerBreakdown(
  db: DB,
  accountId: AccountId,
  windowKind: WindowKind,
  epochId: string,
): LedgerRow[] {
  return db
    .query<LedgerRow, [string, string, string]>(
      `SELECT project_id AS projectId,
              SUM(pct_delta) AS pct,
              SUM(cost_proxy) AS proxy,
              COUNT(*) AS entries,
              SUM(CASE WHEN method IN ('sole','weighted') THEN 1 ELSE 0 END) AS confident
       FROM ledger
       WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?
       GROUP BY project_id
       ORDER BY pct DESC`,
    )
    .all(accountId, windowKind, epochId);
}

export function ledgerTotal(
  db: DB,
  accountId: AccountId,
  windowKind: WindowKind,
  epochId: string,
): number {
  return (
    db
      .query<{ n: number | null }, [string, string, string]>(
        `SELECT SUM(pct_delta) AS n FROM ledger
         WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?`,
      )
      .get(accountId, windowKind, epochId)?.n ?? 0
  );
}

/**
 * Observed percentage points per output token for this account, this epoch.
 *
 * The only honest way to turn a local burn estimate into something comparable
 * with a plan percentage: MEASURED from this account's own history rather than
 * assumed from a published rate. Returns null when there is not enough history,
 * and callers must then degrade rather than guess.
 */
export function pctPerToken(
  db: DB,
  accountId: AccountId,
  windowKind: WindowKind,
  epochId: string,
): number | null {
  const row = db
    .query<{ pct: number | null; proxy: number | null }, [string, string, string]>(
      `SELECT SUM(pct_delta) AS pct, SUM(cost_proxy) AS proxy FROM ledger
       WHERE account_id = ? AND window_kind = ? AND window_epoch_id = ?
         AND method IN ('sole','weighted')
         -- A no-proxy sole row contributes points with zero tokens, which
         -- drifts the rate upward without bound as such intervals accumulate.
         -- Measured 6x high before this clause existed.
         AND cost_proxy > 0`,
    )
    .get(accountId, windowKind, epochId);
  if (!row?.pct || !row.proxy || row.proxy < 10_000) return null;
  return row.pct / row.proxy;
}
