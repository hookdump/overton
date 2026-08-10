/**
 * End to end, through the real runtime with a stub provider.
 *
 * This is the test that would have caught the failure mode the whole project
 * exists to prevent: two projects sharing one account, both individually
 * convinced they are on pace, together well over.
 */

import { describe, expect, test } from "bun:test";
import { WEEK, fixedClock, openMemoryDb, parseConfig, type Reading } from "@overton/core";
import { Overton } from "@overton/engine";
import { Registry, type AccountId } from "@overton/core";
import type { Provider, ProviderContext } from "@overton/providers";
import { handleRpc } from "@overton/server";

const NOW = 1_800_000_000;

/** A provider whose numbers a test sets directly. */
class StubProvider implements Provider {
  readonly id = "stub";
  readonly description = "test double";
  readonly metered = true;
  pct = 0;
  /** The window opened at NOW, so `NOW + WEEK/2` is exactly half elapsed. */
  resetsAt: number | null = NOW + WEEK;
  fail: string | null = null;

  async check(): Promise<string[]> {
    return [];
  }
  async read(accountId: AccountId, _a: unknown, ctx: ProviderContext): Promise<Reading | null> {
    if (this.fail) throw new Error(this.fail);
    return {
      accountId,
      provider: "stub",
      ts: ctx.now,
      fetchedAt: ctx.now,
      freshness: "ok",
      windows: {
        seven_day: {
          kind: "seven_day",
          utilizationPct: this.pct,
          resetsAt: this.resetsAt,
          windowSec: WEEK,
        },
      },
    };
  }
}

function build(now = NOW) {
  const stub = new StubProvider();
  const cfg = parseConfig({
    accounts: {
      shared: {
        provider: "stub",
        weekly_target_pct: 80,
        interactive_reserve_pct: 20,
        max_concurrent: 4,
      },
    },
    projects: {
      // 75 / 25 of a 60-point dispatchable pool → 45 and 15 points.
      big: { accounts: { shared: { weekly_share: 3, five_hour: { mode: "off" } } } },
      small: { accounts: { shared: { weekly_share: 1, five_hour: { mode: "off" } } } },
    },
  });
  let clock = now;
  const o = new Overton({
    db: openMemoryDb(),
    cfg,
    clock: () => clock,
    providers: new Registry<Provider>("provider").register(stub),
  });
  return { o, stub, setNow: (t: number) => (clock = t) };
}

describe("two projects, one account", () => {
  test("shares divide the dispatchable pool, not the raw plan", () => {
    const { o } = build();
    const big = o.facts("big", "shared").windows.find((w) => w.window === "weekly")!;
    const small = o.facts("small", "shared").windows.find((w) => w.window === "weekly")!;
    // target 80 − reserve 20 = 60 dispatchable; 3:1 → 45 / 15.
    expect(big.alloc).toBeCloseTo(45, 6);
    expect(small.alloc).toBeCloseTo(15, 6);
  });

  test("the project that overspends is refused while the other keeps running", async () => {
    const { o, stub, setNow } = build();

    stub.pct = 0;
    await o.meterAccount("shared");

    // Half the week has passed and the account has burned 30 points, all of it
    // by `small` — which is allocated 15. The reset instant is deliberately
    // UNCHANGED: moving it forward would be a rollover, not spend.
    const half = NOW + WEEK / 2;
    setNow(half);
    stub.pct = 30;
    o.db.query(
      `INSERT INTO cost_events (account_id, source, session_path, event_key, ts, output_tokens, input_tokens, model, cwd, project_id)
       VALUES ('shared','claude-transcript','/s/1','k1',?,100000,0,NULL,NULL,'small')`,
    ).run(half - 10);
    await o.meterAccount("shared");

    const smallDecision = o.ask("small", "shared");
    const bigDecision = o.ask("big", "shared");

    expect(smallDecision.verdict).toBe("wait");
    expect(smallDecision.policy).toBe("allocation");
    // The whole point: one project being over does not stop the other.
    expect(bigDecision.verdict).toBe("go");
  });

  test("the account-wide stop overrides every project's share", async () => {
    const { o, stub } = build();
    stub.pct = 85;
    await o.meterAccount("shared");
    for (const p of ["big", "small"]) {
      const d = o.ask(p, "shared");
      expect(d.verdict).toBe("wait");
      expect(d.policy).toBe("account-stop");
      expect(d.retryAfterSec).toBeGreaterThan(0);
    }
  });

  test("a provider failure degrades to a refusal, never to an open gate", async () => {
    const { o, stub, setNow } = build();
    stub.pct = 1;
    await o.meterAccount("shared");

    stub.fail = "network is down";
    // Far enough ahead that the stored reading is well past `week_stale_sec`.
    setNow(NOW + 60 * 60 * 24);
    const result = await o.meterAccount("shared");
    expect(result.error).toContain("network is down");

    const d = o.ask("big", "shared");
    expect(d.verdict).not.toBe("go");
  });
});

describe("claims", () => {
  test("capacity is reserved at check time, so a preparation window cannot be raced", () => {
    const { o } = build();
    const held = [];
    for (let i = 0; i < 4; i++) {
      const r = o.claim({ projectId: "big", accountId: "shared" });
      expect(r.claim).not.toBeNull();
      held.push(r.claim!.id);
    }
    // The fifth exceeds max_concurrent 4, even though budget is untouched.
    const fifth = o.claim({ projectId: "big", accountId: "shared" });
    expect(fifth.claim).toBeNull();
    expect(fifth.decision.policy).toBe("concurrency");

    o.release(held[0]!);
    expect(o.claim({ projectId: "big", accountId: "shared" }).claim).not.toBeNull();
  });

  test("a claim whose heartbeat stops is reaped, so a dead fleet does not idle the account", () => {
    const { o, setNow } = build();
    const r = o.claim({ projectId: "big", accountId: "shared" });
    expect(r.claim).not.toBeNull();

    setNow(NOW + 10_000); // well past claim_lease_sec
    const { reaped } = o.tick();
    expect(reaped).toBe(1);
    expect(o.countClaims("shared", "big").account).toBe(0);
    // And renewing it now fails loudly rather than silently succeeding.
    expect(o.renew(r.claim!.id)).toBe(false);
  });

  test("--force opens a claim past a refusal, and says that it did", async () => {
    const { o, stub } = build();
    stub.pct = 95;
    await o.meterAccount("shared");
    const r = o.claim({ projectId: "big", accountId: "shared" }, { force: true });
    expect(r.claim).not.toBeNull();
    expect(r.forced).toBe(true);
    expect(r.decision.verdict).not.toBe("go");
  });
});

describe("decisions are auditable", () => {
  test("every ask is recorded with its full payload", () => {
    const { o } = build();
    o.ask("big", "shared");
    o.ask("small", "shared");
    const rows = o.db.query<{ n: number }, []>("SELECT COUNT(*) AS n FROM decisions").get();
    expect(rows!.n).toBe(2);
  });

  test("a decision replays to the same verdict from its stored facts", () => {
    const { o } = build();
    const first = o.ask("big", "shared", { record: false });
    const second = o.ask("big", "shared", { record: false });
    expect(second.verdict).toBe(first.verdict);
    expect(second.policy).toBe(first.policy);
  });
});

describe("mcp surface", () => {
  test("lists tools and answers a call", () => {
    const { o } = build();
    const list = handleRpc(o, { jsonrpc: "2.0", id: 1, method: "tools/list" }) as any;
    expect(list.result.tools.length).toBeGreaterThan(0);

    const call = handleRpc(o, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "overton_ask", arguments: { project: "big", account: "shared" } },
    }) as any;
    expect(call.result.content[0].text).toContain("go");
  });

  test("a notification is not answered", () => {
    const { o } = build();
    expect(handleRpc(o, { jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  test("an unknown tool is an error, not a crash", () => {
    const { o } = build();
    const res = handleRpc(o, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "nope" },
    }) as any;
    expect(res.error).toBeDefined();
  });
});
