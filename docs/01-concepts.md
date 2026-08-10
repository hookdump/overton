# 01 — Concepts

Overton knows about four nouns. Everything else is derived.

```
Account   a subscription with rolling usage windows   (your Claude Max seat)
Project   something that wants to spend from accounts (a repo, a client)
Window    one instance of a vendor's rolling limit    (this week's 7d window)
Claim     an open piece of work holding capacity      (a run, right now)
```

Deliberately absent: runs, worktrees, tickets, PRs, branches, engines, models.
Those belong to whatever is asking.

---

## Windows and epochs

A **window** is a vendor's rolling limit: Anthropic reports a 5-hour and a
7-day one, Codex reports whatever its plan has, and the lengths are read from
the vendor rather than assumed.

An **epoch** is *one instance* of a window. This week's 7-day window is a
different epoch from last week's, and ledger entries belong to an epoch rather
than to a window kind.

That indirection is what makes attribution zero at exactly the moment the
vendor's window zeroes. Without it, every gate carries one window's worth of
stale history forward and drifts.

### A rollover is detected, never assumed

A new epoch is opened only when the evidence supports it:

| signal | opens an epoch? |
|---|---|
| no open epoch for this (account, window) | yes — bootstrap |
| the reset instant moved **forward** | yes — the vendor says it is a new window |
| utilization dropped **and** the previous window's reset instant has passed | yes |
| utilization dropped **and** it collapsed by >50% **and** the reset instant is not the same one | yes |
| utilization dropped, reset instant unchanged | **no** — this is a bad reading |
| utilization dropped, no reset instant at all | **no** — no evidence either way |

The last two rows are load-bearing. Opening an epoch zeroes every project's
used points, so an uncorroborated downtick silently discards a week of
attribution and opens every gate on the account. Worse, the obvious health
check cannot see it — the unobserved baseline absorbs exactly the orphaned
points, so drift still reads `0.00`.

Uncorroborated drops are **reported** (`overton meter` prints a warning) rather
than smoothed away, because a provider reporting non-monotonically is a real
bug worth fixing.

## Freshness

How much a reading can be trusted, per window:

| state | meaning | gateable? |
|---|---|---|
| `ok` | usable | yes |
| `stale` | describes a live window, but spend has happened since | yes, with the burn charged against headroom |
| `expired` | the window it describes has ended; every number in it is void | no |
| `unknown` | no reading, or none for this window | no |

`expired` is checked *before* age: a reading taken one second ago about a window
that reset one second ago is still void.

**A degraded reading may only ever tighten a gate, never open one.** This is
enforced mechanically by `applyFreshness`, and property-tested across the whole
ladder — there is no input that makes a degraded reading allow more than a fresh
one.

A **reported** window and a **fresh** window are different things. Some Codex
tiers report only a weekly figure; treating that absence as `unknown` would
refuse every request on a perfectly healthy account. A window the vendor never
sends is simply not gated on.

## Shares and allocation

```
dispatchable = weekly_target_pct − interactive_reserve_pct
alloc        = dispatchable × normalised_share
```

A share is **of the dispatchable pool, not of the plan**. With
`weekly_target_pct: 85` and `interactive_reserve_pct: 15`, agents share 70
points and your own terminal work keeps the rest. `weekly_share: 0.3` means 30%
of what is available to agents.

Shares are **weights**, normalised across every enabled project that names the
account. Three projects at `1` each get a third; changing one to `3` gives it
¾ and the others absorb the difference. There is no column to keep summing to
1.0.

A share of `0` is a positive statement — *this project may never use this
account* — and produces `deny`, not `wait`. Time will not change it.

## Pacing against the clock

A 7-day budget only means something relative to how much of the week has passed.
59% used is alarming on day one and comfortable on day seven, and ranking
accounts by raw percentage gets it exactly backwards.

```
allowance = max(floor, elapsed × alloc) + slack
```

- **`elapsed`** comes from the vendor's reset instant, not from a record of when
  the window opened — there is no such record, and reconstructing one from
  message timestamps is how pacing drifts.
- **`floor`** (default 15% of alloc) exists because the allowance collapses at a
  window boundary. The instant a window resets, `elapsed` is 0 and a project
  could spend nothing — stalling the fleet precisely when a fresh week opens
  with everything to spend. The elapsed term takes over within a day.
- **`slack`** (default 5%) is tolerance, so a single run cannot trip a gate.

A window with **no reset instant** is missing data, so `elapsed` is treated as
`0`, collapsing the allowance to `floor + slack`. Treating it as `1` would be
the loosest possible value and would silently hand out several times what the
clock permits.

### The 5-hour window is different

It exists to be burned and refills several times a day, so pacing it blocks
useful work to protect a budget about to be handed back. Three modes:

| mode | behaviour |
|---|---|
| `burst` (default) | no pacing; a flat ceiling, plus a share of *simultaneous capacity* |
| `pace` | paced like the weekly window |
| `off` | not gated on at all |

In `burst` mode the share governs concurrency: `ceil(share × max_concurrent)`,
floored at 1. That is what stops one project draining each refill the moment it
lands while another starves.

## Attribution

The vendor reports **one** number per account. It does not know your projects.
So splitting it is inference, and the design is honest about that:

> **For any interval, `SUM(pct_delta)` equals the observed delta exactly.**
> We may be wrong about *who* spent it. We are never wrong about *how much*.

Between two readings, the account moved by some number of points. Overton
divides that delta across projects using local evidence — output tokens
observed in transcripts, matched to a project by the session's working
directory (longest declared root wins).

| method | when | confidence |
|---|---|---|
| `weighted` | several projects with a usable cost proxy — the normal case | 1.0 |
| `sole` | exactly one candidate; no inference at all | 1.0 / 0.6 |
| `equal` | several open claims, no proxy — an even split, flagged | 0.3 |
| `residual` | nothing of ours was running → `@interactive` | 1.0 |

`@interactive` is a first-class project: your own terminal sessions, and
anything else sharing the subscription. Naming that bucket rather than spreading
it across projects is what keeps the ledger honest.

`overton ledger <account>` shows the split alongside the vendor's own total.
They will not match exactly — the ledger starts when Overton does — but a
*widening* gap means a spend source is being missed.

### Why output tokens

Utilization is not a pure function of output tokens. What matters is not that
the absolute numbers are right, but that the **ratio** between concurrent
projects is roughly right, and that spend Overton did not cause is visibly
excluded rather than silently absorbed.

Where a stale reading has to be priced in points, the rate is **measured** from
this account's own history (`pctPerToken`), never assumed from a published rate.
With no measured rate yet, the gate refuses rather than guessing.

## Claims

Overton runs nothing, so a claim is not a lease over a worktree. It is a
statement that some process is spending on this account for this project right
now. It exists for two reasons only: concurrency policy counts them, and
attribution needs to know who was active when there is no cost proxy.

**Capacity is reserved at check time, not at launch time.** A caller that asks,
spends sixty seconds preparing a workspace and only then registers gives every
other caller a sixty-second window to pass the same check — and they all will.
`overton claim` opens the row as part of asking.

**Claims are reaped, not trusted.** A recorded pid is not a reliable liveness
test (engines fork), so the heartbeat is the authority. A claim not renewed
within `claim_lease_sec` is marked `expired` — distinct from `closed`, so
"finished" and "vanished" stay tellable apart. Without this, twenty runs failing
together would hold their claims forever and idle the account until a human
looked.

`overton run` handles the whole lifecycle, releasing in a `finally` so a crash
or a signal still gives the capacity back.

## The decision

Every request produces a `Decision`:

```jsonc
{
  "verdict": "wait",
  "policy": "allocation",              // which policy decided
  "summary": "sideproject is over its weekly allocation on claude-personal",
  "detail":   ["account   …", "project   …", "clock     …"],
  "remedies": ["try --account claude-work (2.1 of 40.0 pts used)", "…"],
  "retryAfterSec": 15120,
  "rulings": [ /* every policy's ruling, including the ones that lost */ ],
  "request": { "project": "sideproject", "account": "claude-personal", "at": 1786370883 }
}
```

Every decision is written to the `decisions` table with its full payload. A gate
nobody can review after the fact is a gate nobody trusts, and *"why did it
refuse at 03:00"* is the question that gets asked about an autonomous fleet.

`retryAfterSec` under pacing is **not** the window reset — it is the moment the
clock catches up with what has already been spent, which is usually much
sooner. It is never derived from an expired window, whose reset instant is in
the past and would yield a zero-length backoff that looks deliberate.
