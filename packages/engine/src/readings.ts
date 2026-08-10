/**
 * Reading storage. History is retained so the ledger can be recomputed from
 * source and so a curve can be drawn; the gate only ever wants the latest.
 */

import {
  withFreshness,
  type AccountId,
  type DB,
  type FreshnessConfig,
  type Reading,
  type WindowKind,
  type WindowReading,
} from "@overton/core";

interface ReadingRow {
  account_id: string;
  provider: string;
  ts: number;
  fetched_at: number;
  plan: string | null;
  windows: string;
}

function toReading(row: ReadingRow): Reading {
  return {
    accountId: row.account_id,
    provider: row.provider,
    ts: row.ts,
    fetchedAt: row.fetched_at,
    plan: row.plan ?? undefined,
    windows: JSON.parse(row.windows) as Partial<Record<WindowKind, WindowReading>>,
    // Recomputed by the caller against `now`. The stored value is never trusted:
    // a reading that was fresh when written is not fresh an hour later.
    freshness: "unknown",
  };
}

export function saveReading(db: DB, reading: Reading): void {
  db.query(
    `INSERT INTO readings (account_id, provider, ts, fetched_at, plan, windows)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    reading.accountId,
    reading.provider,
    reading.ts,
    reading.fetchedAt,
    reading.plan ?? null,
    JSON.stringify(reading.windows),
  );
}

/** The newest reading for an account, with freshness recomputed against `now`. */
export function latestReading(
  db: DB,
  accountId: AccountId,
  now: number,
  freshness: FreshnessConfig,
): Reading | null {
  const row = db
    .query<ReadingRow, [string]>(
      `SELECT account_id, provider, ts, fetched_at, plan, windows FROM readings
       WHERE account_id = ? ORDER BY ts DESC, id DESC LIMIT 1`,
    )
    .get(accountId);
  return row ? withFreshness(toReading(row), now, freshness) : null;
}

/** The one before the newest — the baseline a delta is measured against. */
export function previousReading(
  db: DB,
  accountId: AccountId,
  now: number,
  freshness: FreshnessConfig,
): Reading | null {
  const rows = db
    .query<ReadingRow, [string]>(
      `SELECT account_id, provider, ts, fetched_at, plan, windows FROM readings
       WHERE account_id = ? ORDER BY ts DESC, id DESC LIMIT 2`,
    )
    .all(accountId);
  const row = rows[1];
  return row ? withFreshness(toReading(row), now, freshness) : null;
}

/** Trim history. Called from the tick; retention is generous because rows are tiny. */
export function pruneReadings(db: DB, olderThan: number): number {
  const res = db.query("DELETE FROM readings WHERE ts < ?").run(olderThan);
  return res.changes;
}
