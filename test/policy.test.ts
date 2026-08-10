/**
 * The invariants, as executable statements.
 *
 * These are not "does the code run" tests. Each one is a rule that, if broken,
 * silently hands out capacity nobody paid for — which is the only failure mode
 * of a budget arbiter that actually matters.
 */

import { describe, expect, test } from "bun:test";
import {
  FIVE_HOURS,
  FRESHNESS_LADDER,
  VERDICT_SEVERITY,
  WEEK,
  applyFreshness,
  elapsedFraction,
  humanDuration,
  parseConfig,
  windowFreshness,
  worseVerdict,
  type Freshness,
} from "@overton/core";
import { allowanceFor, runChain, defaultPolicies, type Facts, type Policy } from "@overton/policy";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const NOW = 1_800_000_000;

function facts(over: Partial<Facts> = {}): Facts {
  const cfg = parseConfig({
    accounts: { a: { provider: "anthropic", weekly_target_pct: 85, interactive_reserve_pct: 15 } },
    projects: { p: { accounts: { a: { weekly_share: 1 } } } },
  });
  return {
    now: NOW,
    projectId: "p",
    accountId: "a",
    account: cfg.accounts.a!,
    projectAccount: cfg.projects.p!.accounts.a!,
    shares: { weekly: 1, fiveHour: 1 },
    metered: true,
    reading: {
      accountId: "a",
      provider: "anthropic",
      ts: NOW,
      fetchedAt: NOW,
      windows: {
        seven_day: { kind: "seven_day", utilizationPct: 20, resetsAt: NOW + WEEK / 2, windowSec: WEEK },
      },
      freshness: "ok",
    },
    accountPct: 20,
    windows: [
      {
        window: "weekly",
        kind: "seven_day",
        reported: true,
        freshness: "ok",
        epochId: "win_1",
        reading: { kind: "seven_day", utilizationPct: 20, resetsAt: NOW + WEEK / 2, windowSec: WEEK },
        mode: "pace",
        alloc: 70,
        used: 10,
        allowance: 40,
        elapsed: 0.5,
        staleAdjustment: 0,
        blocked: null,
      },
    ],
    claims: { project: 0, account: 0 },
    hasCostSource: true,
    policy: cfg.policy,
    alternatives: [],
    ...over,
  };
}

const chain = () => defaultPolicies().all();

// ---------------------------------------------------------------------------

describe("the chain takes the worst verdict, not the first", () => {
  const permissive: Policy = {
    id: "permissive",
    description: "always allows",
    evaluate: () => ({ verdict: "go", summary: "fine by me" }),
  };
  const strict: Policy = {
    id: "strict",
    description: "always denies",
    evaluate: () => ({ verdict: "deny", summary: "absolutely not" }),
  };

  test("a permissive policy cannot override a strict one, in either order", () => {
    const a = runChain([permissive, strict], facts());
    const b = runChain([strict, permissive], facts());
    expect(a.verdict).toBe("deny");
    expect(b.verdict).toBe("deny");
  });

  test("no ordering of any policy set is more permissive than its strictest member", () => {
    const policies = [...chain(), permissive];
    const shuffles = [policies, [...policies].reverse(), [policies[2]!, permissive, ...policies.slice(0, 2)]];
    const verdicts = shuffles.map((p) => runChain(p, facts({ accountPct: 99 })).verdict);
    expect(new Set(verdicts).size).toBe(1);
    expect(verdicts[0]).not.toBe("go");
  });

  test("a policy that throws refuses, and never opens the gate", () => {
    const broken: Policy = {
      id: "broken",
      description: "throws",
      evaluate: () => {
        throw new Error("boom");
      },
    };
    const d = runChain([broken], facts());
    expect(d.verdict).toBe("ask");
    expect(d.summary).toContain("boom");
  });

  test("verdict severity is a total order with go at the bottom", () => {
    expect(VERDICT_SEVERITY.go).toBe(0);
    expect(worseVerdict("go", "wait")).toBe("wait");
    expect(worseVerdict("deny", "ask")).toBe("deny");
    expect(worseVerdict("wait", "wait")).toBe("wait");
  });
});

describe("degradation may only tighten", () => {
  test("allowance is monotonically non-increasing along the freshness ladder", () => {
    let previous = Infinity;
    for (const f of FRESHNESS_LADDER) {
      const value = applyFreshness(f, { allowancePct: 50, burnPct: 7 });
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  test("no burn value makes a degraded reading allow more than a fresh one", () => {
    for (const burn of [0, 1, 10, 1000, -5]) {
      for (const f of FRESHNESS_LADDER as Freshness[]) {
        expect(applyFreshness(f, { allowancePct: 50, burnPct: burn })).toBeLessThanOrEqual(
          applyFreshness("ok", { allowancePct: 50, burnPct: burn }),
        );
      }
    }
  });

  test("an expired window is expired regardless of how recently it was read", () => {
    const w = { kind: "five_hour", utilizationPct: 3, resetsAt: NOW - 1, windowSec: FIVE_HOURS };
    expect(windowFreshness(w, NOW, NOW)).toBe("expired");
  });

  test("a blocked window refuses rather than passing vacuously", () => {
    const f = facts();
    f.windows[0]!.blocked = "the seven_day reading is stale and cannot be priced";
    const d = runChain(chain(), f);
    expect(d.verdict).toBe("wait");
    expect(d.policy).toBe("reading-guard");
  });
});

describe("allocation", () => {
  test("a window with no reset instant collapses to floor+slack, never a full window", () => {
    const withReset = allowanceFor({
      alloc: 100,
      resetsAt: NOW + WEEK,
      windowSec: WEEK,
      now: NOW,
      floorPct: 0.15,
      slackPct: 0.05,
    });
    const withoutReset = allowanceFor({
      alloc: 100,
      resetsAt: null,
      windowSec: WEEK,
      now: NOW,
      floorPct: 0.15,
      slackPct: 0.05,
    });
    // Missing data must not be the loosest case.
    expect(withoutReset.allowance).toBeLessThanOrEqual(withReset.allowance);
    expect(withoutReset.allowance).toBe(20);
  });

  test("the floor keeps the fleet moving the instant a window resets", () => {
    const a = allowanceFor({
      alloc: 100,
      resetsAt: NOW + WEEK,
      windowSec: WEEK,
      now: NOW,
      floorPct: 0.15,
      slackPct: 0.05,
    });
    expect(a.elapsed).toBe(0);
    expect(a.allowance).toBeGreaterThan(0);
  });

  test("pacing tracks the clock, so the same usage is fine later and not earlier", () => {
    const early = allowanceFor({
      alloc: 100,
      resetsAt: NOW + WEEK * 0.9,
      windowSec: WEEK,
      now: NOW,
      floorPct: 0.15,
      slackPct: 0.05,
    });
    const late = allowanceFor({
      alloc: 100,
      resetsAt: NOW + WEEK * 0.1,
      windowSec: WEEK,
      now: NOW,
      floorPct: 0.15,
      slackPct: 0.05,
    });
    expect(late.allowance).toBeGreaterThan(early.allowance);
  });

  test("share 0 is a deny, not a wait — time will not change it", () => {
    const f = facts();
    f.windows[0]!.alloc = 0;
    const d = runChain(chain(), f);
    expect(d.verdict).toBe("deny");
  });

  test("an account at its target stops every project, however small its share", () => {
    const d = runChain(chain(), facts({ accountPct: 90 }));
    expect(d.verdict).toBe("wait");
    expect(d.policy).toBe("account-stop");
  });

  test("being over allocation offers a retry sooner than the window reset", () => {
    const f = facts();
    f.windows[0]!.used = 39;
    f.windows[0]!.allowance = 35;
    const d = runChain(chain(), f);
    expect(d.verdict).toBe("wait");
    expect(d.retryAfterSec).not.toBeNull();
    expect(d.retryAfterSec!).toBeLessThanOrEqual(WEEK / 2);
  });

  test("an unmetered account has no budget to be over", () => {
    const d = runChain(chain(), facts({ metered: false, accountPct: null, windows: [] }));
    expect(d.verdict).toBe("go");
  });
});

describe("concurrency", () => {
  test("the account ceiling applies across projects", () => {
    const f = facts({ claims: { project: 0, account: 6 } });
    const d = runChain(chain(), f);
    expect(d.verdict).toBe("wait");
    expect(d.policy).toBe("concurrency");
  });

  test("a project cannot monopolise a refill", () => {
    const f = facts({ claims: { project: 3, account: 3 }, shares: { weekly: 1, fiveHour: 0.5 } });
    f.windows.push({
      window: "five_hour",
      kind: "five_hour",
      reported: true,
      freshness: "ok",
      epochId: "win_2",
      reading: { kind: "five_hour", utilizationPct: 10, resetsAt: NOW + 3600, windowSec: FIVE_HOURS },
      mode: "burst",
      alloc: 37.5,
      used: 0,
      allowance: 37.5,
      elapsed: 1,
      staleAdjustment: 0,
      blocked: null,
    });
    const d = runChain(chain(), f);
    expect(d.verdict).toBe("wait");
    expect(d.summary).toContain("concurrency share");
  });
});

describe("a refusal is always actionable", () => {
  test("every non-go verdict names at least one way out", () => {
    const cases = [
      facts({ accountPct: 99 }),
      facts({ claims: { project: 0, account: 6 } }),
      (() => {
        const f = facts();
        f.windows[0]!.used = 99;
        return f;
      })(),
    ];
    for (const f of cases) {
      const d = runChain(chain(), f);
      expect(d.verdict).not.toBe("go");
      expect(d.remedies.length).toBeGreaterThan(0);
    }
  });

  test("an allow still shows its working", () => {
    const d = runChain(chain(), facts());
    expect(d.verdict).toBe("go");
    expect(d.detail.length).toBeGreaterThan(0);
  });
});

describe("time", () => {
  test("elapsed fraction is clamped to [0,1] even with a stale reset instant", () => {
    expect(elapsedFraction(NOW - WEEK, WEEK, NOW)).toBe(1);
    expect(elapsedFraction(NOW + WEEK * 3, WEEK, NOW)).toBe(0);
  });

  test("durations carry up the unit ladder rather than rendering 1h60m", () => {
    expect(humanDuration(7199)).toBe("2h");
    expect(humanDuration(86399)).toBe("1d");
    expect(humanDuration(3660)).toBe("1h1m");
  });
});
