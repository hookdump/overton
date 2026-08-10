# 05 — Invariants

Rules that must not regress. Each one was learned by breaking it, and each has a
test that fails if it comes back.

A budget arbiter has exactly one failure mode that matters: **silently handing
out capacity nobody paid for**. Almost every rule here exists because some
plausible-looking shortcut did that.

---

## I-1 — Unknown is never reported as zero

A provider that cannot reach its source throws. It never returns a reading with
`0%`, and a missing window is **absent** from `windows` rather than present as
zero.

*Why:* "unknown" and "0% used" produce opposite decisions. A broken credential
that reads as an empty account opens every gate.

→ `test/ledger.test.ts` — *"a body with no recognisable window throws rather than
reporting 0%"*, *"a codex plan reporting only a weekly window leaves five_hour
ABSENT"*

## I-2 — A degraded reading may only tighten a gate, never open one

`applyFreshness` is monotonically non-increasing along
`ok → stale → unknown → expired`, for every input.

*Why:* the alternative is a gate that silently opens exactly when it has the
least information.

→ `test/policy.test.ts` — *"allowance is monotonically non-increasing along the
freshness ladder"*, *"no burn value makes a degraded reading allow more than a
fresh one"*

## I-3 — Missing the means to measure is missing data

An account with no local transcript source cannot observe burn, so a staleness
check against it would pass vacuously at any age. That is a statement about our
blindness, not about the account, and it blocks rather than passes.

*Why:* it is indistinguishable from a fresh reading while real spend happens on
another machine sharing the subscription.

→ `test/e2e.test.ts` — *"a provider failure degrades to a refusal, never to an
open gate"*

## I-4 — A rollover is detected, never assumed

A utilization drop alone is not a new window. It must be corroborated by the
reset instant moving forward, by the previous window's reset having passed, or
by a collapse too large to be a bad reading *and* a reset instant that is not
the same one.

*Why:* opening an epoch zeroes every project's used points. Observed live during
a plan upgrade: one reading arrived with `utilizationPct: 0` and
`resetsAt: null`; the collapse alone closed both epochs, discarding the week's
attribution baseline and handing every project a full fresh allowance on top of
what it had already spent. And the obvious health check could not see it — the
unobserved baseline absorbs exactly the orphaned points, so drift still read
`0.00`.

*Corollary:* an unchanged reset instant is positive proof this is the **same**
window and may not be overridden by the size of the drop. A missing reset
instant is no evidence at all.

→ `test/ledger.test.ts` — *"a bare drop with an unchanged reset instant is NOT a
rollover"* and the three tests around it

## I-5 — An expired reading never derives a retry-after

`canDeriveRetryAfter` is false for `expired` and `unknown`.

*Why:* an expired window's reset instant is in the past, so a backoff built from
it is zero-length — worse than no backoff, because it looks deliberate and turns
a polite caller into a hot loop.

→ enforced in `account-stop` and `allocation`; `windowFreshness` checks expiry
*before* age, so a reading taken one second ago about a window that reset one
second ago is still void.

## I-6 — Attribution sums to the observed delta, exactly

For any interval, `SUM(pct_delta) == deltaPct`. Not approximately.

The last entry absorbs the remainder by assignment (`delta − sum(others)`),
never by nudging and re-rounding.

*Why:* rounding the correction leaves up to 5e-7 per interval unaccounted for —
meaningless once, and a slow leak in the one number this system promises is
never wrong.

→ `test/ledger.test.ts` — *"the split sums to the observed delta exactly"*, *"the
sum is exact for awkward deltas across many projects"*

## I-7 — Attribution admits what it guessed

Every ledger entry records its `method`. An even split with no cost signal is
labelled `equal` with confidence 0.3, so a refusal built on it can be distrusted
appropriately.

Spend with nothing of ours running goes to `@interactive`, never to whichever
project happened to be open.

→ `test/ledger.test.ts` — *"a guessy split is labelled as one"*, *"spend with
nothing of ours running is charged to @interactive"*

## I-8 — The measured rate ignores rows with no proxy

`pctPerToken` excludes `cost_proxy = 0` rows.

*Why:* a no-proxy `sole` row contributes points with zero tokens, drifting the
rate upward without bound as such intervals accumulate. Measured 6× high before
this clause existed.

→ `test/ledger.test.ts` — *"the measured rate ignores rows with no proxy"*

## I-9 — Pace against the clock, with a floor

`allowance = max(floor, elapsed × alloc) + slack`.

*Why:* 59% used is alarming on day one and comfortable on day seven. And without
the floor the fleet stalls the instant a window resets — `elapsed = 0` means an
allowance of just the slack, precisely when a fresh window opens with everything
to spend.

→ `test/policy.test.ts` — *"the floor keeps the fleet moving the instant a window
resets"*, *"pacing tracks the clock"*

## I-10 — A window with no reset instant collapses the allowance

`elapsed` is `0`, not `1`, when `resetsAt` is null.

*Why:* `1` is the loosest value in the formula — it grants a full window's
allowance on day one — and a null reset instant does not mark the window stale,
so the gate would silently hand out several times what the clock permits.

→ `test/policy.test.ts` — *"a window with no reset instant collapses to
floor+slack"*

## I-11 — Worst verdict wins, not first match

Every policy rules; the chain takes the worst. No ordering of any policy set can
produce a more permissive answer than its strictest member.

*Why:* with first-match, correctness depends on the order of a list in a config
file, and reordering it to "put the cheap checks first" can silently let a budget
policy be pre-empted.

*Corollary:* a policy that throws yields `ask`, never `go`.

→ `test/policy.test.ts` — *"a permissive policy cannot override a strict one, in
either order"*, *"no ordering ... is more permissive than its strictest member"*,
*"a policy that throws refuses"*

## I-12 — A share of zero is a deny, not a wait

*Why:* `alloc = 0, used = 0, 0 > 0 === false` reads as "no budget" and behaves as
"one free run" — and the concurrency floor of 1 lets it through. It is an
eligibility statement, not a budget one, and time will not change it.

→ `test/policy.test.ts` — *"share 0 is a deny, not a wait"*

## I-13 — Capacity is reserved at check time

`overton claim` opens the claim row as part of asking.

*Why:* a caller that asks, spends sixty seconds preparing a workspace and only
then registers gives every other caller a sixty-second window to pass the same
check — and they all will.

→ `test/e2e.test.ts` — *"capacity is reserved at check time"*

## I-14 — Claims are reaped, not trusted

The heartbeat is the authority; a recorded pid is a hint for humans only,
because engines fork.

*Why:* nothing notices when a fleet dies. Twenty concurrent runs failing together
hold their claims forever, concurrency policy then refuses everything, and the
host sits idle until a human looks.

→ `test/e2e.test.ts` — *"a claim whose heartbeat stops is reaped"*

## I-15 — Cost cursors advance only with their events

A scan returns events *and* cursors; the caller commits both in one transaction.

*Why:* a cursor advanced before its events are stored permanently skips whatever
a crash lost, and the loss is silent — the project simply looks cheaper than it
was.

→ `packages/ledger/src/events.ts`, `saveCostEvents`

## I-16 — Event keys are content-derived, never position-derived

*Why:* an index within a parse shifts the moment the read window slides, and
deduplication then stops working. Measured: a 9.7 MiB rollout re-inserted its
entire history on every tick, so its project's proxy grew without bound and every
other project on the account was charged almost nothing.

*Related:* Claude transcripts deduplicate by `requestId`, because one request is
written across several streamed records that each repeat the same cumulative
usage block — 27 assistant lines for 10 distinct requests, measured.

→ `packages/ledger/src/sources/codex.ts`, `claude.ts`

## I-17 — Vendor window names are never trusted; sort by length

Codex's `primary` / `secondary` do not mean short / long. The same account has
reported a 5h primary with a weekly secondary, and a weekly primary with nothing
else.

→ `test/ledger.test.ts` — *"codex windows are ordered by length, never by the
primary/secondary name"*

## I-18 — A window the vendor does not report is not a degraded reading

Some plans report only a weekly figure. Treating that absence as `unknown`
refuses every request on a perfectly healthy account.

`reported: false` and `freshness: "unknown"` are different facts.

→ `packages/engine/src/facts.ts`; `test/ledger.test.ts`

## I-19 — Display tolerance is not the gate's threshold

The gate refuses at `used > allowance` with no tolerance. Renderers receive the
gate's own `over` boolean and may only choose how the *number* is phrased.

*Why:* a renderer that rounds 0.01 points away paints "on pace" over a project
the next request will be refused for — the instrument contradicting the thing it
measures.

→ `packages/core/src/fmt.ts`, `paceState`; `packages/engine/src/views.ts`

## I-20 — Every refusal names a way out

*Why:* a refusal without a remedy is a dead end, and a fleet that hits one at
03:00 just stops.

→ `test/policy.test.ts` — *"every non-go verdict names at least one way out"*

---

## Running them

```bash
bun test
bun run typecheck
```

If you are adding a rule to this file, add the test in the same commit. A stated
invariant with no test is a comment.
