/**
 * The cost-source contract.
 *
 * A cost source observes LOCAL evidence of spend — transcripts on disk — so
 * attribution has a ratio to divide a global percentage by. It is deliberately
 * separate from the provider that reads the window: a vendor may publish a
 * usable percentage with no local transcript (nothing to divide by), or write
 * transcripts with no published percentage (nothing to divide).
 *
 * What matters is not that the absolute token counts are right — utilization is
 * not a pure function of output tokens — but that the RATIO between concurrent
 * projects is roughly right, and that spend Overton did not cause is visibly
 * excluded rather than silently absorbed.
 */

import type { AccountConfig, AccountId, CostEvent, DB, Plugin } from "@overton/core";
import type { ScanCursor } from "./scan.ts";

export interface ScanResult {
  events: CostEvent[];
  /**
   * Returned rather than written, so the caller can advance them in the same
   * transaction that stores the events. A cursor advanced before the commit
   * permanently skips whatever a crash lost.
   */
  cursors: ScanCursor[];
}

export interface CostSource extends Plugin {
  /** Can this source observe this account at all? */
  supports(account: AccountConfig): boolean;
  /** Incremental. `sinceMtime` skips files that cannot have changed. */
  scan(db: DB, accountId: AccountId, account: AccountConfig, sinceMtime: number): ScanResult;
}
