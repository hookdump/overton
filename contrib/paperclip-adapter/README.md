# `overton-paperclip-adapter`

A [Paperclip][paperclip] adapter that gates every heartbeat on
[Overton][overton]'s subscription-window budget, then runs Claude Code, Codex or
Ollama.

Paperclip enforces budgets in **currency** — each agent gets a monthly figure
and pauses at 100%. That is the right model for API keys. On subscriptions the
binding constraint is a rolling **plan window** that several projects share, and
no amount of dollars unblocks a 7-day limit. This adapter adds that half.

---

## Install

```bash
git clone https://github.com/hookdump/overton
cd overton/contrib/paperclip-adapter
bun install && bunx tsc      # or: npm install && npx tsc
```

Then in Paperclip: **Adapters → Install External Adapter → Local path**, and
point it at this directory. Paperclip validates that the package exports
`createServerAdapter()` and registers the adapter type `overton`.

After changing the code, **restart Paperclip**. `Reload` on the adapter row
refreshes the registry record, but Node's ESM cache keeps returning the module
that was imported first, so code edits do not take effect until the process
restarts.

## Configure an agent

Set the agent's adapter to **Overton (budget-gated)**. The form is rendered from
a live schema, so the account dropdown lists your real Overton accounts with
their current utilization:

| field | | |
|---|---|---|
| `account` | **required** | which subscription to spend from, e.g. `claude-personal` |
| `project` | | whose share of it; defaults to the Paperclip company id |
| `engine` | | `claude`, `codex` or `ollama` |
| `model` | | passed through; blank uses the engine default |
| `configDir` | | `CLAUDE_CONFIG_DIR` for this seat |
| `codexHome` | | `CODEX_HOME` for this seat |
| `cwd` | | working directory — also how Overton attributes the spend |
| `force` | | run even when refused; recorded, counted against the next window |

> **Match the seat to the account.** If `account` names your personal Claude
> seat, `configDir` must point at the personal profile. Gating on one
> subscription while spending from another makes every number downstream wrong,
> and nothing else will complain — the environment test warns when it is unset.

## What a refusal looks like

The heartbeat exits non-zero **without starting the engine**, and the run log
carries the reason and the way out:

```
overton: wait — sideproject is over its weekly allocation on claude-personal
  account   claude-personal  7d 43% used (target 85, your reserve 15)
  project   sideproject  alloc 17.5 pts  used 21.3 pts
  clock     32% of the window elapsed → allowance 6.4 pts
  → try --account claude-work (2.1 of 40.0 pts used)
  → run it anyway with --force — logged, and counted against the next window
  retry in ~252 min
```

| exit | meaning |
|---|---|
| `75` | the window will reopen — `retryNotBefore` carries when |
| `78` | the pairing is not allowed at all; waiting will not change it |
| `1` | misconfigured (no `account`) |

No tokens are spent in any of those cases. The distinct codes matter: a
heartbeat reporting `0` without running the agent looks, in every dashboard,
exactly like one where the agent ran and found nothing to do.

## Native quota reporting

The adapter implements `getQuotaWindows()`, so Overton's readings appear in
Paperclip's own quota surface rather than only in a terminal:

```
claude-personal 5h    20%   resets in 2h53m · plan pro
claude-personal 7d    44%   resets in 4d18h · plan pro
claude-work 7d         0%   plan team
codex-personal 7d      4%   resets in 5d6h · reading is stale · plan plus
ollama — unmetered      —   local or separately billed; no window to spend
```

Each account is a separate row on purpose. Collapsing a personal and a work
Claude seat into one provider row is precisely the conflation Overton exists to
undo. A never-metered account reports a `null` percentage rather than being
omitted — "no reading" and "0% used" are opposite facts.

## What the agent actually receives

Same three things the built-in adapters give it, because without any one of them
a run completes and the issue still stalls:

| | |
|---|---|
| **Prompt** | `context.paperclipTaskMarkdown` + the wake note + session handoff + the standing heartbeat template — composed in Paperclip's order. A resumed session gets only the delta. |
| **Environment** | `buildPaperclipEnv(agent)` plus the run, task, wake, approval and linked-issue vars, and `PAPERCLIP_API_KEY` from the run's `authToken` — never from config. |
| **Tools** | Paperclip's per-run MCP servers, written to a 0600 config and passed as `--mcp-config … --strict-mcp-config`. This is what lets the agent record a disposition. |

If Paperclip supplies no MCP servers for a run, the adapter says so in the log
rather than letting you discover it from an issue that never closes. The Codex
and Ollama engines take MCP through their own config rather than a flag, so they
can do work but cannot close issues — use Claude for issue-driven agents.

## Design notes

**It fails closed.** With no arbiter reachable, the heartbeat is skipped rather
than run unmetered. Missing information must not authorise spend; that is the
whole premise. A skipped heartbeat costs one cycle.

**Capacity is reserved before the engine starts,** not after. The gap between
asking and spawning is long enough for every other agent to pass the same check,
and they all would.

**Claims are heartbeated during the run** and released in a `finally`, so a
crash, a timeout or a cancellation gives the capacity back rather than idling
the account until Overton's reaper notices.

**It uses Paperclip's own helpers.** The first version imported only types, on
the theory that zero runtime dependencies made the gate unbreakable. That was
the wrong trade: an agent needs the prompt, environment and MCP config that
`@paperclipai/adapter-utils` assembles, and hand-rolling them produced an agent
that woke up, found nothing, and reported it had nothing to do. The gate is the
easy half; being a real Paperclip citizen is the rest.

The Overton client is still hand-rolled over `fetch`, so nothing about Overton's
own API depends on Paperclip's release cycle.

**One adapter, three engines** rather than three adapters. The interesting
behaviour is the gate and it is identical for every engine; three near-identical
packages would drift. Adding Gemini or Pi is an entry in `src/engines.ts` and an
option in the config schema.

**Billing type is reported as `subscription`,** so Paperclip's dollar budget does
not double-count work that Overton already governs. On a subscription the CLI
reports `total_cost_usd: 0`, which is correct and is exactly why the plan window
is the constraint that matters.

## Development

```bash
bun install
bunx tsc --watch
```

Smoke-test against a live Overton without going through Paperclip:

```bash
overton daemon &
node --input-type=module -e '
  import { createServerAdapter } from "./dist/index.js";
  const a = createServerAdapter();
  console.log(await a.getQuotaWindows());
  console.log(await a.testEnvironment({ companyId:"c", adapterType:"overton",
    config:{ account:"claude-personal", engine:"claude" }}));
'
```

## Compatibility

Built against `@paperclipai/adapter-utils@2026.722.0`, which it depends on at
runtime for the prompt, environment and MCP assembly. Pin it to the version your
Paperclip ships; rebuild after upgrading Paperclip.

Local-path adapters need a **Paperclip restart** to pick up code changes —
`Reload` refreshes the registry record, but Node's ESM cache keeps serving the
first-imported module.

[paperclip]: https://github.com/paperclipai/paperclip
[overton]: https://github.com/hookdump/overton
