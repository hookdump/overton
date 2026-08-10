/**
 * Window epochs — rollover detection.
 *
 * A ledger entry belongs to an epoch, and an epoch corresponds to one instance
 * of a vendor window. That indirection is what makes attribution zero at exactly
 * the moment the vendor's window zeroes; without it every gate carries one
 * window's worth of stale history forward and drifts.
 *
 * A rollover is DETECTED, never assumed from a clock, because the window
 * boundary belongs to the vendor.
 */

import { newId, type AccountId, type DB, type Reading, type WindowEpoch, type WindowKind } from "@overton/core";

/** Float noise in a percentage is not a rollover. A real one drops by points. */
const UTILIZATION_EPS = 0.001;

/**
 * The reported reset instant jitters by well under a second between polls
 * (microsecond-precision ISO timestamps, re-rendered per request). A genuine
 * rollover moves it by hours, so a one-minute deadband costs nothing and stops
 * jitter from opening an epoch on every tick.
 */
const RESET_FORWARD_EPS = 60;

/** A drop this large is hard to explain as a bad read. */
export const LARGE_DROP_FRACTION = 0.5;

export interface UncorroboratedDrop {
  kind: WindowKind;
  from: number;
  to: number;
}

export interface EpochSync {
  epochId: string;
  kind: WindowKind;
  /**
   * True when this call OPENED a new epoch — bootstrap included. Callers use it
   * to suppress the delta across the boundary: the drop from 96% to 2% is a
   * reset, not a refund.
   */
  rolled: boolean;
}

export interface EpochSyncResult {
  synced: EpochSync[];
  /**
   * Drops that looked like a rollover but could not be corroborated. Reported
   * rather than acted on: a provider reporting non-monotonically is a bug worth
   * seeing, and silently smoothing it hides that.
   */
  uncorroborated: UncorroboratedDrop[];
}

interface EpochRow {
  id: string;
  account_id: string;
  kind: string;
  opened_at: number;
  resets_at: number | null;
  closed: number;
}

function toRecord(row: EpochRow): WindowEpoch {
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    openedAt: row.opened_at,
    resetsAt: row.resets_at,
    closed: row.closed !== 0,
  };
}

export function currentEpoch(db: DB, accountId: AccountId, kind: WindowKind): WindowEpoch | null {
  const row = db
    .query<EpochRow, [string, string]>(
      `SELECT id, account_id, kind, opened_at, resets_at, closed FROM window_epochs
       WHERE account_id = ? AND kind = ? AND closed = 0
       ORDER BY opened_at DESC LIMIT 1`,
    )
    .get(accountId, kind);
  return row ? toRecord(row) : null;
}

/**
 * Reconcile the epoch table with a fresh reading.
 *
 * Returns one entry per window present in the reading, so a caller can tag its
 * ledger writes without a second lookup. Windows absent from the reading are
 * left entirely alone — an unread window is not a closed one.
 */
export function syncEpochs(
  db: DB,
  reading: Reading,
  prevReading: Reading | null | undefined,
  now: number,
): EpochSyncResult {
  const synced: EpochSync[] = [];
  const uncorroborated: UncorroboratedDrop[] = [];

  for (const [key, window] of Object.entries(reading.windows)) {
    if (!window) continue;
    const kind = key as WindowKind;
    const open = currentEpoch(db, reading.accountId, kind);
    const prev = prevReading?.windows[kind];

    // A DROP ALONE IS NOT A ROLLOVER.
    //
    // Opening an epoch zeroes every project's used points, so an uncorroborated
    // downtick silently discards a window of attribution and opens every gate
    // on the account. Worse, the obvious health check cannot see it: the
    // unobserved baseline absorbs exactly the orphaned points, so drift still
    // reads 0.00 — a check structurally incapable of detecting the defect it
    // exists for.
    //
    // This is not hypothetical. A provider that inspects only the newest files
    // by mtime can have a file touched later carrying an OLDER block evict the
    // one holding the current figure, making the reported percentage
    // non-monotonic by construction.
    //
    // So a drop must be corroborated by one of:
    //   * the reset instant also moving forward (the vendor says it is new)
    //   * the previous window's reset instant having actually passed
    //   * a drop too large to be a bad reading — but see `sameWindow` below
    const rawDrop = prev != null && window.utilizationPct < prev.utilizationPct - UTILIZATION_EPS;
    const previousWindowEnded =
      (open?.resetsAt != null && now >= open.resetsAt) || (prev?.resetsAt != null && now >= prev.resetsAt);
    const collapsed = prev != null && window.utilizationPct < prev.utilizationPct * (1 - LARGE_DROP_FRACTION);

    // Compare against both baselines: the open epoch survives daemon restarts
    // (when prevReading may be absent), and prevReading catches the case where
    // the epoch was opened before the vendor published a reset instant.
    const baselines = [open?.resetsAt, prev?.resetsAt].filter((v): v is number => v != null);
    const movedForward =
      window.resetsAt != null && baselines.some((b) => window.resetsAt! > b + RESET_FORWARD_EPS);

    // An UNCHANGED reset instant is positive proof this is the SAME window, and
    // a MISSING one is no evidence at all. Neither may be overridden by the
    // size of the drop.
    //
    // Observed in production on a live plan upgrade: one reading arrived with
    // `utilizationPct: 0` and `resetsAt: null` while the vendor switched plans.
    // The next reading carried the SAME weekly reset instant as every reading
    // before it — the week had plainly not rolled — but the collapse alone had
    // already closed both epochs, discarding the week's attribution baseline
    // and handing every project a fresh allowance on top of what it had spent.
    const sameWindow =
      window.resetsAt != null && baselines.some((b) => Math.abs(window.resetsAt! - b) <= RESET_FORWARD_EPS);
    const collapseCorroborates = collapsed && window.resetsAt != null && !sameWindow;

    const dropped = rawDrop && (previousWindowEnded || collapseCorroborates);
    if (rawDrop && !dropped && !movedForward) {
      uncorroborated.push({ kind, from: prev!.utilizationPct, to: window.utilizationPct });
    }

    if (open && !dropped && !movedForward) {
      // Same window. Backfill a reset instant we did not have when it opened.
      if (open.resetsAt == null && window.resetsAt != null) {
        db.query("UPDATE window_epochs SET resets_at = ? WHERE id = ?").run(window.resetsAt, open.id);
      }
      synced.push({ epochId: open.id, kind, rolled: false });
      continue;
    }

    synced.push({ epochId: openEpoch(db, reading.accountId, kind, window.resetsAt, now), kind, rolled: true });
  }

  return { synced, uncorroborated };
}

/** Closes every open epoch for the (account, kind) and opens a fresh one. */
function openEpoch(
  db: DB,
  accountId: AccountId,
  kind: WindowKind,
  resetsAt: number | null,
  now: number,
): string {
  return db.transaction(() => {
    db.query("UPDATE window_epochs SET closed = 1 WHERE account_id = ? AND kind = ? AND closed = 0").run(
      accountId,
      kind,
    );

    // UNIQUE (account_id, kind, opened_at): two rollovers inside one second are
    // implausible, but a re-run at the same clock second is not, and losing the
    // insert would leave the (account, kind) with no open epoch at all.
    let openedAt = now;
    const clash = db.query<{ n: number }, [string, string, number]>(
      "SELECT COUNT(*) AS n FROM window_epochs WHERE account_id = ? AND kind = ? AND opened_at = ?",
    );
    while ((clash.get(accountId, kind, openedAt)?.n ?? 0) > 0) openedAt++;

    const id = newId("win");
    db.query(
      `INSERT INTO window_epochs (id, account_id, kind, opened_at, resets_at, closed)
       VALUES (?, ?, ?, ?, ?, 0)`,
    ).run(id, accountId, kind, openedAt, resetsAt);
    return id;
  })();
}

/**
 * Close epochs whose reset instant has passed, for reporting and cleanup.
 *
 * Deliberately NOT called from `syncEpochs`: closing on the clock alone would
 * leave an (account, kind) with no open epoch between the reset instant and the
 * next poll, and any spend landing in that gap would have nowhere to go.
 * `syncEpochs` closes the old epoch at the moment it opens the new one.
 */
export function closeElapsedEpochs(db: DB, now: number): number {
  const before = db.query<{ n: number }, []>("SELECT total_changes() AS n").get()?.n ?? 0;
  db.query(
    "UPDATE window_epochs SET closed = 1 WHERE closed = 0 AND resets_at IS NOT NULL AND resets_at <= ?",
  ).run(now);
  const after = db.query<{ n: number }, []>("SELECT total_changes() AS n").get()?.n ?? 0;
  return after - before;
}
