# 03 — Policies

A policy is a **pure function from stated facts to a ruling**. It does no IO,
has no clock of its own, and reaches for nothing — everything it may consider is
in `Facts`.

Three things fall out of that:

- every refusal in a test is reproducible from a literal;
- a stored decision can be replayed and produce the same answer;
- *"why did it refuse at 03:00"* is answerable without a debugger
  (`overton explain` prints the whole `Facts` value).

---

## The chain

```yaml
policy:
  chain: [account-stop, reading-guard, allocation, concurrency]
```

**Every policy rules on every request, and the worst verdict wins.** Not
first-match: worst.

That choice is the tightening rule made structural. With first-match, the
correctness of a gate depends on the order of a list in a config file, and
someone reordering it to "put the cheap checks first" can silently let a budget
policy be pre-empted by a permissive one. With worst-wins, **no ordering of any
set of policies can produce a more permissive answer than the strictest policy
in it**. Order decides only which of two *equally severe* rulings is reported as
the headline.

```
go (0)  <  wait (1)  <  ask (2)  <  deny (3)
```

`deny` outranks `ask` because a human approving something policy forbids is a
different and deliberate act — a `--force`, not an answer to a prompt.

A policy that **throws** yields `ask`, never `go`. A budget guard that cannot
decide must refuse and say so.

When several equally severe rulings carry a `retryAfterSec`, the **shortest**
wins: waking earlier than strictly necessary costs one refused request, while
waking later silently idles the fleet.

## The built-ins

### `account-stop`

Stops every project once the account itself reaches `weekly_target_pct`.

A project being under its own share does not entitle it to the last points of
the plan. That headroom is what lets you notice a limit before a run does — and
it is the only thing standing between an over-eager fleet and your own terminal
session at 11pm.

### `reading-guard`

Refuses when the reading is too degraded to gate on honestly. This is what makes
every other policy's arithmetic meaningful.

Note the polarity: **missing the means to measure is itself missing data.** An
account with no local transcript source can never observe burn, so a staleness
check against it would pass vacuously at any age — indistinguishable from a
fresh reading while real spend happens on another machine sharing the
subscription.

Its `retryAfterSec` is one poll interval, not the window reset: the *reading* is
what is broken, and it is due to be replaced shortly.

### `allocation`

The centrepiece. Two refusals, different in kind:

- **allocated nothing** (`weekly_share: 0`) → `deny`. Time will not change it.
  Without this, `alloc = 0, used = 0, 0 > 0 === false` reads as "no budget" and
  behaves as "one free run".
- **over allocation** → `wait`, with a retry-after computed from when the clock
  catches up, not from the window reset.

### `concurrency`

Two ceilings: the account's `max_concurrent` across all projects, and — in
`burst` mode — the project's share of simultaneous slots. Applies to unmetered
accounts too.

---

## Writing a policy

```ts
import { wait, deny, type Ruling } from "@overton/core";
import type { Facts, Policy } from "@overton/policy";

/** No autonomous dispatch between 01:00 and 07:00 local time. */
export class QuietHoursPolicy implements Policy {
  readonly id = "quiet-hours";
  readonly description = "No dispatch overnight";

  constructor(private readonly from = 1, private readonly to = 7) {}

  evaluate(f: Facts): Ruling | null {
    const hour = new Date(f.now * 1000).getHours();
    if (hour < this.from || hour >= this.to) return null;   // no opinion

    const wakeAt = new Date(f.now * 1000);
    wakeAt.setHours(this.to, 0, 0, 0);

    return wait("quiet hours — no dispatch until 07:00", {
      detail: [`local time is ${hour}:00`],
      remedies: ["--force if this is genuinely urgent"],
      retryAfterSec: Math.ceil(wakeAt.getTime() / 1000 - f.now),
    });
  }
}
```

Register it and add it to the chain:

```ts
const policies = defaultPolicies().register(new QuietHoursPolicy());
const overton = new Overton({ db, cfg, policies });
```

```yaml
policy:
  chain: [account-stop, reading-guard, allocation, concurrency, quiet-hours]
```

Your policy **cannot weaken the built-ins**. Because the worst verdict wins,
returning `go` from a custom policy has exactly the same effect as returning
`null`. Policies can only tighten.

## What is in `Facts`

```ts
interface Facts {
  now: number;
  projectId: string;
  accountId: string;
  account: AccountConfig;              // the whole account block, incl. your keys
  projectAccount: ProjectAccountConfig | null;   // null → project may not use it
  shares: { weekly: number; fiveHour: number };  // normalised, 0-1
  metered: boolean;                    // false → no window to be over
  reading: Reading | null;
  accountPct: number | null;           // account-wide weekly utilization
  windows: WindowFacts[];              // only the windows this project gates on
  claims: { project: number; account: number };
  hasCostSource: boolean;              // can this account's burn be observed?
  policy: PolicyConfig;
  alternatives: Array<{ accountId; used; alloc }>;  // for the remedy line
}

interface WindowFacts {
  window: "weekly" | "five_hour";
  reported: boolean;        // did the vendor send this window AT ALL?
  freshness: Freshness;
  mode: "pace" | "burst" | "off";
  alloc: number;            // points allocated to this project
  used: number;             // points already attributed this epoch
  allowance: number;        // what it may have spent BY NOW
  elapsed: number;          // 0-1
  staleAdjustment: number;  // points added because the reading is stale
  blocked: string | null;   // set when the reading cannot be gated on honestly
  reading: WindowReading | null;
  epochId: string | null;
}
```

`reported: false` is **not** a degraded reading — it means the vendor does not
send that window for this plan. Check it before concluding anything from a
window's absence.

## Writing a good refusal

A refusal without a way out is a dead end, and a fleet that hits one at 03:00
just stops. Every built-in refusal carries `remedies`, and there is a test
asserting that every non-`go` verdict names at least one.

| field | for | rule |
|---|---|---|
| `summary` | the headline | one line, names the subject, no numbers |
| `detail` | the evidence | the numbers go here, one fact per line |
| `remedies` | the way out | imperative, concrete, at least one |
| `retryAfterSec` | machines | only for `wait`; never from an expired window |

Never derive a retry-after from a window that has already ended: the instant is
in the past, the wait is zero, and a polite caller becomes a hot loop.
