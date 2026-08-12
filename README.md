# Overton

**Admission control for the coding agents you already pay for.**

> *The Overton window: the range of dispatches currently acceptable.*

You have four subscriptions and seven projects. Every orchestrator on your
machine — [Symphony][symphony], [Paperclip][paperclip], [gastown][gastown], a
cron script — will happily spawn an agent the moment it has work, because none
of them know what the others are spending. Plan limits are per **account**.
Ambition is per **project**. Nothing reconciles the two, so every project
independently concludes it is on pace while together they are well over.

Overton is a small daemon that does exactly one thing: **decide who may run, on
whose budget, right now.**

```console
$ overton ask sideproject claude-personal
wait 4h12m · sideproject is over its weekly allocation on claude-personal
  account   claude-personal  7d 43% used (target 85, your reserve 15)
  project   sideproject  alloc 17.5 pts  used 21.3 pts
  clock     32% of the window elapsed → allowance 6.4 pts
  reading   ok, 41s old
  over by 14.9 pts. At this rate it finishes the window at 66.5 pts (380% of alloc).

  → try --account claude-work (2.1 of 40.0 pts used)
  → run it anyway with --force — logged, and counted against the next window
  → wait 4d19h — the clock catches up
```

It does **not** run agents. No worktrees, no tickets, no PRs, no merge queue.
Sixty tools do that and they get better every month. Overton sits in front of
them.

---

## Four verbs

| | |
|---|---|
| **Meter** | Every account's real 5h / 7d utilization, from the vendor's own authority — not an estimate. |
| **Attribute** | A ledger of what each *project* actually spent from each *account window*. |
| **Allocate** | Weighted fair share of a rolling window. Reroute capacity between projects by changing one number. |
| **Gate** | A typed decision — `go` / `wait` / `ask` / `deny` — with a reason, a remedy, and a retry-after. |

## Why a verdict and not a boolean

"No" has three meanings, and an orchestrator that cannot tell them apart either
hammers a gate that will refuse it for four days, or gives up on a window that
reopens in ten minutes.

| verdict | meaning | what the caller should do | exit code |
|---|---|---|---|
| `go` | budget and capacity available | dispatch | 0 |
| `wait` | time fixes this | sleep `retryAfterSec`, ask again | 10 |
| `ask` | a human fixes this | escalate; do not retry on a timer | 11 |
| `deny` | policy fixes this | never retry; this pairing is not allowed | 12 |

```bash
overton ask myproject claude-personal || case $? in
  10) sleep "$(overton ask myproject claude-personal --json | jq .retryAfterSec)" ;;
  12) echo "not allowed on this account, ever"; exit 1 ;;
esac
```

## Install

Needs [Bun](https://bun.sh) ≥ 1.3.

```bash
git clone https://github.com/hookdump/overton && cd overton
bun install
bun link                    # puts `overton` on your PATH

overton init                # writes ~/.overton/config.yaml
$EDITOR ~/.overton/config.yaml
overton doctor              # verify credentials before you rely on it
overton meter               # poll every account once
overton status
```

```console
$ overton status
ACCOUNT          PROVIDER   PLAN  7d                5h   READING    CLAIMS
---------------  ---------  ----  ----------------  ---  ---------  ------
claude-personal  anthropic  max   [####------] 43%  14%  3s ago     0/6
claude-work      anthropic  team  [----------] 0%   0%   2s ago     0/6
codex-personal   codex      plus  [----------] 4%   —    20h3m ago  0/6
ollama           unmetered  —     unmetered         —    1s ago     0/2

PROJECT   ACCOUNT          SHARE  USED/ALLOWED  PACE        VERDICT
--------  ---------------  -----  ------------  ----------  -------
loopdeck  claude-personal  75%    0.0/19.2      under 19.2  go
loopdeck  codex-personal   100%   0.0/22.2      under 22.2  go
overton   claude-personal  25%    0.0/6.4       under 6.4   go
```

## Using it

The simplest integration is the wrapper — ask, hold capacity, run, release:

```bash
overton run myproject claude-personal -- claude -p "fix issue 42"
```

Or wire it into whatever you already use. Three surfaces, same answers:

```bash
overton ask myproject claude-personal            # CLI, exit code carries the verdict
curl 'localhost:7787/v1/ask?project=P&account=A' # HTTP, always 200, decision in the body
overton mcp                                      # MCP over stdio, so an agent can ask
```

See [`docs/04-integration.md`](docs/04-integration.md) for recipes covering
Symphony, Paperclip, GitHub Actions and a bare shell loop.

## More than one machine

A laptop and a build host sharing one subscription each think they are on pace,
for the same reason two orchestrators do. Run Overton on one of them and point
the others' CLI at it, and there is a single arbiter again:

```yaml
# ~/.overton/config.yaml on the laptop
remotes:
  e16:
    url: https://overton.my-tailnet.ts.net
default_remote: e16
```

```console
$ overton status
overton · e16 https://overton.my-tailnet.ts.net
ACCOUNT          PROVIDER   PLAN  7d                5h  READING  CLAIMS
---------------  ---------  ----  ----------------  --  -------  ------
claude-personal  anthropic  pro   [######----] 57%  0%  2m ago   0/6
```

Or per invocation: `overton --remote e16 status`, `--remote https://host` for
one that is not in the config, or `$OVERTON_REMOTE` for a shell. The name is on
every line of output because *which* Overton answered is not something anyone
should have to infer.

The deciding and looking commands go over the wire; `meter`, `daemon`, `serve`,
`mcp`, `doctor`, `plugins`, `init`, `paperclip` and `explain` stay local and say
why. **Nothing ever falls back.** An unreachable remote is exit 1 with the URL
and the cause — never a plausible table quietly rendered from this machine's own
database, which would be wrong in every number and admit it in none.

Exit codes and `--json` are identical either way, so a script cannot tell the
difference. [`docs/04-integration.md`](docs/04-integration.md#multiple-machines--remote-mode)
has the precedence rules and the full command split.

## Configuration

```yaml
accounts:
  claude-personal:
    provider: anthropic
    config_dir: ~/.claude-profiles/personal
    weekly_target_pct: 85          # account-wide stop, all projects
    interactive_reserve_pct: 15    # held back for YOUR terminal work
    max_concurrent: 6

projects:
  bigapp:
    roots: [~/Projects/bigapp]
    accounts:
      claude-personal: { weekly_share: 3 }

  sideproject:
    roots: [~/Projects/sideproject]
    accounts:
      claude-personal: { weekly_share: 1 }
      # claude-work is simply not named, so it may never be used
```

Two things about that file do most of the work.

**A share is of the dispatchable pool, not of the plan.** `85 − 15 = 70` points
are available to agents; `bigapp` gets ¾ of them and `sideproject` ¼. Your own
interactive work is never what gets squeezed.

**Shares are weights, normalised across every project naming the account.** You
reroute capacity by changing one number and the others absorb it — there is no
column to keep summing to 1.0 by hand.

## How it decides

```
    provider ──▶ reading ──▶ epoch ──▶ ledger ──▶ facts ──▶ policy chain ──▶ decision
   (vendor's     (windows,   (one      (per-       (pure     (worst          (verdict,
    authority)   freshness)  window    project     data)     verdict          reason,
                             instance) points)               wins)            retry)
```

Every policy rules on every request and the **worst verdict wins** — not the
first match. With first-match, correctness depends on the order of a list in a
config file, and reordering it to "put the cheap checks first" can silently let
a budget policy be pre-empted. With worst-wins, no ordering of any policy set
can produce a more permissive answer than its strictest member.

`overton explain <project> <account>` prints every fact behind a decision.

## Extending it

Three registries, one shape. Implement the interface, register it, name it in
config.

| Extend | To add | Docs |
|---|---|---|
| `Provider` | a new vendor's windows (Gemini, Copilot, Qwen, Kiro…) | [`docs/02-providers.md`](docs/02-providers.md) |
| `CostSource` | a new transcript format to attribute by | [`docs/02-providers.md`](docs/02-providers.md) |
| `Policy` | a rule of your own — quiet hours, per-model caps, cost ceilings | [`docs/03-policies.md`](docs/03-policies.md) |

A policy you add cannot accidentally weaken the built-ins. It can only tighten
them, because of worst-wins.

## What it deliberately is not

- **A harness.** It never invokes an agent. `overton run` spawns your command and
  gets out of the way.
- **An orchestrator.** No tickets, no worktrees, no merge queue.
- **A fleet TUI.** `overton status` is a table, not a dashboard.
- **A proxy.** Your credentials are never routed through it; it reads them to
  ask the vendor about your own usage, nothing more.
- **Multi-user.** Tailscale is the perimeter. It binds loopback and has no auth.

## Honesty rules

A budget arbiter that is confidently wrong is worse than none, so:

- **Unknown is never reported as zero.** A provider that cannot reach its source
  says so. "Unknown" and "0% used" produce opposite decisions.
- **A degraded reading may only tighten a gate, never open one.** Enforced
  mechanically, with a property test over the whole freshness ladder.
- **Attribution admits what it guessed.** The vendor gives one number per
  account; splitting it across projects is inference. Every ledger entry records
  its method, and `SUM(pct_delta)` always equals the observed delta exactly — we
  may be wrong about *who* spent it, never about *how much*.
- **A rollover is detected, never assumed.** A bare utilization drop with an
  unchanged reset instant is a bad reading, not a fresh window — treating it as
  one discards a week of attribution and opens every gate on the account.

These are stated as executable rules in [`docs/05-invariants.md`](docs/05-invariants.md)
and tested in [`test/`](test/).

## Where it came from

Overton is the quota half of **Loopdeck2**, extracted and rewritten. Loopdeck2
tried to be a whole control plane — workflows, GitHub, dispatch, a deck — and
the ecosystem shipped better versions of all of it during 2026. What nobody
shipped, across ~200 orchestrators surveyed, was allocating a share of a rolling
subscription window to a project and enforcing it. Paperclip has budgets in
dollars; Quotio does per-account failover; LoopX gives per-goal hints;
claudexor rotates between accounts on exhaustion. None of them keeps a
per-(account, window, project) ledger.

So this is the part worth having, alone, small enough to adopt without adopting
anything else.

The metering findings that make it possible — the Anthropic OAuth usage endpoint
and its mandatory `User-Agent`, and the `rate_limits` block Codex writes into
its rollout JSONL — are documented in [`docs/02-providers.md`](docs/02-providers.md).

## Docs

| | |
|---|---|
| [01 — Concepts](docs/01-concepts.md) | Windows, epochs, shares, pacing, claims, the decision |
| [02 — Providers](docs/02-providers.md) | How metering works per vendor, and how to add one |
| [03 — Policies](docs/03-policies.md) | The chain, and writing a rule of your own |
| [04 — Integration](docs/04-integration.md) | Recipes: Symphony, Paperclip, Actions, shell, MCP |
| [05 — Invariants](docs/05-invariants.md) | The rules that must not regress |

## Roster — the other half

Overton answers *may this project spend on this account right now?* It does not
answer *who is this seat, and how do I run as it?* — which credential directory,
which plan, whether the seat is even signed in.

[Roster][roster] answers that, and reads the same `accounts:` block out of this
config. One registry, two readers; neither tool requires the other, which is the
point — adopt the one you need.

```console
$ roster ls                                    # who is available to play
$ roster run claude-personal -- claude -p "…"  # identity, no gate
$ overton run side claude-personal -- claude   # gate, then identity
```

Together they are **Desk** — in an orchestra, a desk is two players sharing one
stand.

## Status

**v0.1 — working, and young.** Metering, attribution, allocation, gating,
claims, CLI, HTTP and MCP all run against real accounts. 79 tests.

A web deck ships with the daemon at `http://127.0.0.1:7787` — accounts against
the clock, and a slider per project for dividing each account's week, which
shows what every other project's share becomes before anything is written.

Not yet: attribution for spend on a machine other than the arbiter's — remote
mode gates correctly there, but the transcripts are not on the arbiter's disk,
so that spend lands in `@interactive`. Nor more providers than the three here.
Issues and PRs welcome — especially new providers.

## License

MIT © Ignacio Freiberg

[symphony]: https://github.com/openai/symphony
[paperclip]: https://github.com/paperclipai/paperclip
[gastown]: https://github.com/steveyegge/gastown
[roster]: https://github.com/hookdump/roster
