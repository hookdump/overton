/**
 * Attribution and rollover: the two places where being subtly wrong is
 * indistinguishable from working.
 */

import { describe, expect, test } from "bun:test";
import { INTERACTIVE, WEEK, openMemoryDb, type DB, type Reading } from "@overton/core";
import {
  attribute,
  ledgerBreakdown,
  ledgerTotal,
  pctPerToken,
  saveAttribution,
  saveCostEvents,
  syncEpochs,
} from "@overton/ledger";
import { parseRateLimits, extractRateLimits, parseUsage, parseLimits } from "@overton/providers";

const NOW = 1_800_000_000;

function reading(over: Partial<Reading> & { pct?: number; resetsAt?: number | null } = {}): Reading {
  return {
    accountId: "a",
    provider: "anthropic",
    ts: over.ts ?? NOW,
    fetchedAt: NOW,
    freshness: "ok",
    windows: {
      seven_day: {
        kind: "seven_day",
        utilizationPct: over.pct ?? 10,
        resetsAt: over.resetsAt === undefined ? NOW + WEEK : over.resetsAt,
        windowSec: WEEK,
      },
    },
    ...(over.windows ? { windows: over.windows } : {}),
  };
}

function seedCost(db: DB, projectId: string, ts: number, outputTokens: number) {
  saveCostEvents(
    db,
    "a",
    [
      {
        accountId: "a",
        source: "claude-transcript",
        sessionPath: `/s/${projectId}-${ts}-${outputTokens}`,
        eventKey: `${ts}:${outputTokens}`,
        ts,
        outputTokens,
        inputTokens: 0,
      },
    ],
    [],
    () => projectId,
    ts,
  );
}

describe("attribution never loses or invents points", () => {
  test("the split sums to the observed delta exactly", () => {
    const db = openMemoryDb();
    seedCost(db, "alpha", NOW + 10, 1000);
    seedCost(db, "beta", NOW + 20, 3000);

    const { entries, method } = attribute(db, {
      accountId: "a",
      windowKind: "seven_day",
      windowEpochId: "e1",
      t0: NOW,
      t1: NOW + 60,
      deltaPct: 7.3,
    });

    expect(method).toBe("weighted");
    const sum = entries.reduce((s, e) => s + e.pctDelta, 0);
    // Exactly, not approximately: the remainder is assigned, never re-rounded.
    expect(sum).toBe(7.3);
  });

  test("the sum is exact for awkward deltas across many projects", () => {
    for (const delta of [0.1, 1 / 3, 99.99, 0.0000007]) {
      const db = openMemoryDb();
      for (let i = 0; i < 7; i++) seedCost(db, `p${i}`, NOW + i, 100 + i);
      const { entries } = attribute(db, {
        accountId: "a",
        windowKind: "seven_day",
        windowEpochId: "e1",
        t0: NOW - 1,
        t1: NOW + 60,
        deltaPct: delta,
      });
      expect(entries.reduce((s, e) => s + e.pctDelta, 0)).toBe(delta);
    }
  });

  test("spend with nothing of ours running is charged to @interactive, not to a project", () => {
    const db = openMemoryDb();
    const { entries, method } = attribute(db, {
      accountId: "a",
      windowKind: "seven_day",
      windowEpochId: "e1",
      t0: NOW,
      t1: NOW + 60,
      deltaPct: 4,
    });
    expect(method).toBe("residual");
    expect(entries[0]!.projectId).toBe(INTERACTIVE);
  });

  test("a guessy split is labelled as one so a refusal built on it can be distrusted", () => {
    const db = openMemoryDb();
    const now = NOW;
    for (const p of ["x", "y"]) {
      db.query(
        `INSERT INTO claims (id, project_id, account_id, state, opened_at, heartbeat_at, closed_at, label, pid)
         VALUES (?, ?, 'a', 'open', ?, ?, NULL, NULL, NULL)`,
      ).run(`clm_${p}`, p, now, now);
    }
    const { method, confidence } = attribute(db, {
      accountId: "a",
      windowKind: "seven_day",
      windowEpochId: "e1",
      t0: now,
      t1: now + 60,
      deltaPct: 4,
    });
    expect(method).toBe("equal");
    expect(confidence).toBeLessThan(0.5);
  });

  test("attribution is idempotent — replaying an interval does not double it", () => {
    const db = openMemoryDb();
    seedCost(db, "alpha", NOW + 10, 1000);
    const input = {
      accountId: "a",
      windowKind: "seven_day" as const,
      windowEpochId: "e1",
      t0: NOW,
      t1: NOW + 60,
      deltaPct: 5,
    };
    for (let i = 0; i < 3; i++) saveAttribution(db, attribute(db, input).entries, NOW);
    expect(ledgerTotal(db, "a", "seven_day", "e1")).toBeCloseTo(5, 6);
    expect(ledgerBreakdown(db, "a", "seven_day", "e1")).toHaveLength(1);
  });

  test("the measured rate ignores rows with no proxy, which would drift it upward", () => {
    const db = openMemoryDb();
    saveAttribution(
      db,
      [
        // A sole row with zero tokens: points, no proxy. Including it inflates
        // the rate without bound as such intervals accumulate.
        { accountId: "a", windowKind: "seven_day", windowEpochId: "e1", projectId: "p", pctDelta: 5, costProxy: 0, method: "sole", ts: NOW },
      ],
      NOW,
    );
    saveAttribution(
      db,
      [
        { accountId: "a", windowKind: "seven_day", windowEpochId: "e1", projectId: "p", pctDelta: 1, costProxy: 50_000, method: "weighted", ts: NOW + 1 },
      ],
      NOW + 1,
    );
    expect(pctPerToken(db, "a", "seven_day", "e1")).toBeCloseTo(1 / 50_000, 12);
  });
});

describe("rollover is detected, never assumed", () => {
  test("a bare drop with an unchanged reset instant is NOT a rollover", () => {
    const db = openMemoryDb();
    const prev = reading({ pct: 60 });
    syncEpochs(db, prev, null, NOW);
    // Same window (same resetsAt), utilization collapses. This is the live
    // plan-upgrade case: a degenerate reading must not discard the baseline.
    const next = reading({ pct: 0, ts: NOW + 60 });
    const { synced, uncorroborated } = syncEpochs(db, next, prev, NOW + 60);
    expect(synced[0]!.rolled).toBe(false);
    expect(uncorroborated).toHaveLength(1);
  });

  test("a drop is a rollover when the reset instant moves forward", () => {
    const db = openMemoryDb();
    const prev = reading({ pct: 96 });
    syncEpochs(db, prev, null, NOW);
    const next = reading({ pct: 2, ts: NOW + 60, resetsAt: NOW + WEEK * 2 });
    const { synced } = syncEpochs(db, next, prev, NOW + 60);
    expect(synced[0]!.rolled).toBe(true);
  });

  test("a drop is a rollover when the previous window's reset instant has passed", () => {
    const db = openMemoryDb();
    const prev = reading({ pct: 96, resetsAt: NOW + 10 });
    syncEpochs(db, prev, null, NOW);
    const next = reading({ pct: 2, ts: NOW + 60, resetsAt: NOW + 60 + WEEK });
    const { synced } = syncEpochs(db, next, prev, NOW + 60);
    expect(synced[0]!.rolled).toBe(true);
  });

  test("a new epoch zeroes the ledger, so the old window's points do not carry", () => {
    const db = openMemoryDb();
    const prev = reading({ pct: 96 });
    const first = syncEpochs(db, prev, null, NOW);
    saveAttribution(
      db,
      [{ accountId: "a", windowKind: "seven_day", windowEpochId: first.synced[0]!.epochId, projectId: "p", pctDelta: 40, costProxy: 1, method: "sole", ts: NOW }],
      NOW,
    );
    const next = reading({ pct: 2, ts: NOW + 60, resetsAt: NOW + WEEK * 2 });
    const second = syncEpochs(db, next, prev, NOW + 60);
    expect(second.synced[0]!.epochId).not.toBe(first.synced[0]!.epochId);
    expect(ledgerTotal(db, "a", "seven_day", second.synced[0]!.epochId)).toBe(0);
  });

  test("a reset instant learned late is backfilled onto the open epoch", () => {
    const db = openMemoryDb();
    const prev = reading({ pct: 10, resetsAt: null });
    const first = syncEpochs(db, prev, null, NOW);
    const next = reading({ pct: 12, ts: NOW + 60, resetsAt: NOW + WEEK });
    const second = syncEpochs(db, next, prev, NOW + 60);
    expect(second.synced[0]!.epochId).toBe(first.synced[0]!.epochId);
    expect(second.synced[0]!.rolled).toBe(false);
  });
});

describe("provider parsing", () => {
  test("codex windows are ordered by length, never by the primary/secondary name", () => {
    // `primary` is the WEEK here and `secondary` the 5h — the inversion that
    // makes name-based parsing wrong.
    const w = parseRateLimits({
      primary: { window_minutes: 10080, used_percent: 41, resets_at: NOW },
      secondary: { window_minutes: 300, used_percent: 12.5, resets_at: NOW },
      plan_type: "team",
    });
    expect(w.five_hour?.utilizationPct).toBe(12.5);
    expect(w.seven_day?.utilizationPct).toBe(41);
  });

  test("a codex plan reporting only a weekly window leaves five_hour ABSENT, not zero", () => {
    const w = parseRateLimits({ primary: { window_minutes: 10080, used_percent: 41 } });
    expect(w.seven_day).toBeDefined();
    expect(w.five_hour).toBeUndefined();
  });

  test("the newest rate_limits block in a rollout wins", () => {
    const lines = [
      JSON.stringify({ timestamp: NOW, payload: { type: "token_count", rate_limits: { a: { window_minutes: 300, used_percent: 5 } } } }),
      JSON.stringify({ timestamp: NOW + 100, payload: { type: "token_count", rate_limits: { a: { window_minutes: 300, used_percent: 9 } } } }),
      "not json at all",
    ].join("\n");
    expect(extractRateLimits(lines, 0)?.windows.five_hour?.utilizationPct).toBe(9);
  });

  test("anthropic: a null window is a real answer and is not invented as zero", () => {
    const r = parseUsage(
      {
        five_hour: { utilization: 33, resets_at: new Date((NOW + 3600) * 1000).toISOString() },
        seven_day: { utilization: 13, resets_at: new Date((NOW + WEEK) * 1000).toISOString() },
        seven_day_opus: null,
      },
      "a",
      { now: NOW, freshness: { staleSec: 150, weekStaleSec: 21600 } },
    );
    expect(r.windows.five_hour?.utilizationPct).toBe(33);
    expect(r.windows.seven_day_opus).toBeUndefined();
  });

  test("anthropic: a body with no recognisable window throws rather than reporting 0%", () => {
    expect(() => parseUsage({ nonsense: true }, "a", { now: NOW, freshness: { staleSec: 1, weekStaleSec: 1 } })).toThrow();
  });

  test("anthropic: a malformed limits[] entry does not cost the others", () => {
    const w = parseLimits([
      null,
      { kind: "session", percent: 12, resets_at: NOW },
      { kind: "weekly_all", percent: "not a number" },
      { kind: "weekly_all", percent: 44, resets_at: NOW },
    ]);
    expect(w.five_hour?.utilizationPct).toBe(12);
    expect(w.seven_day?.utilizationPct).toBe(44);
  });

  test("percentages are clamped, so a vendor glitch cannot produce a negative budget", () => {
    const w = parseRateLimits({ x: { window_minutes: 300, used_percent: -5 }, y: { window_minutes: 10080, used_percent: 400 } });
    expect(w.five_hour?.utilizationPct).toBe(0);
    expect(w.seven_day?.utilizationPct).toBe(100);
  });
});
