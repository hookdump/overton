# Overton × Paperclip

[Paperclip][paperclip] enforces budgets in **currency**: each agent gets a
monthly figure and pauses at 100%. That is the right model for API keys.

It is the wrong model for **subscriptions**, where the binding constraint is a
rolling plan window that several projects share, and where no amount of dollars
unblocks a 7-day limit at 100%. Paperclip has no concept of that window;
Overton has nothing else.

They compose cleanly. Paperclip decides *what work happens and who does it*.
Overton decides *whether the subscription can afford it right now*.

---

## Three ways in, easiest first

### 1. `process` agents — zero Paperclip changes

Works today. Point the agent's command at [`overton-gate.sh`](overton-gate.sh):

```bash
chmod +x overton-gate.sh
./overton-gate.sh ccmonitor claude-work -- claude -p "$PAPERCLIP_PROMPT"
```

The heartbeat exits `75` (EX_TEMPFAIL) without spending anything when the
budget says no, and `78` (EX_CONFIG) when the pairing is never allowed —
distinct on purpose, because one resolves with time and the other never will.

Limitation: only applies to agents whose `adapterType` is `process`. A
`claude_local` agent is spawned by Paperclip itself, so there is no command to
wrap. For those, use option 2.

### 2. The `overton_gated` wrapping adapter — any adapter type

[`overton-gate.adapter.ts`](overton-gate.adapter.ts) is a `ServerAdapterModule`
that asks Overton, opens a claim, then **delegates to whatever adapter you were
already using** and releases the claim afterwards. It wraps rather than
replaces, so it works with `claude_local`, `codex_local`, `process`, `http`, and
external plugins alike.

```bash
cp overton-gate.adapter.ts <paperclip>/server/src/adapters/overton-gate.ts
```

```ts
// server/src/adapters/registry.ts
import { overtonGatedAdapter } from "./overton-gate.js";

export const ADAPTER_REGISTRY = {
  // …existing entries…
  overton_gated: overtonGatedAdapter,
};
```

Then set an agent's `adapterType` to `overton_gated`:

```json
{
  "account": "claude-work",
  "project": "ccmonitor",
  "inner": { "type": "claude_local", "config": { "model": "opus" } }
}
```

> **Verify the types first.** This file is written against Paperclip's published
> adapter documentation, not compiled against a checkout. Check the three type
> imports (`ServerAdapterModule`, `AdapterExecutionContext`,
> `AdapterExecutionResult`) and the `registry.js` path against your installed
> version before relying on it. If they have drifted, the fix is mechanical —
> the logic does not depend on their shape beyond `config`, `onLog`, `onMeta`
> and the returned `exitCode` / `errorCode` / `errorMessage`.

### 3. MCP — let the agents see their own budget

```bash
claude mcp add overton -- overton mcp
```

Read-only. An agent can find out why it was refused and what else it could use,
without being able to open claims — that belongs to the harness, not the model.

---

## Mapping the two models

| | Paperclip | Overton |
|---|---|---|
| unit | dollars / tokens | percentage points of a rolling plan window |
| scope | per agent, per company | per (account, window, project) |
| period | calendar month | the vendor's own 5h / 7d window |
| on exhaustion | agent pauses | request is refused, with a retry-after |
| knows about | org chart, goals, issues, approvals | subscriptions and who is spending them |

Set an Overton **project** per Paperclip **company** (or per repo, if one company
works several). Set an Overton **account** per subscription. Then a Paperclip
agent's `adapterConfig` names both, and the two budget systems stack:
Paperclip stops runaway *cost*, Overton stops runaway *plan usage*.

## Behaviour worth knowing

**A refusal is a no-op heartbeat, not a failure.** Non-zero exit means no tokens
were spent. It matters that it is not `0` — a heartbeat reporting success
without running the agent looks, in every dashboard, exactly like one where the
agent found nothing to do.

**Both integrations fail closed.** An unreachable Overton skips the heartbeat
rather than running unmetered. Missing information must not authorise spend;
that is the entire premise. A skipped heartbeat costs one cycle.

**Heartbeat cadence is coarser than the gate.** Paperclip wakes agents every few
hours; Overton's `retryAfterSec` may be 12 minutes. The refusal simply means
*this* heartbeat does nothing and the next one tries again — you lose some
responsiveness, not correctness. If you want tighter, shorten the heartbeat
interval for gated agents; refused wakeups are nearly free.

**Claims are heartbeated during the run** and released in a `finally`, so a
crashed or cancelled agent gives its capacity back rather than idling the
account until the reaper notices.

## Verifying it

```bash
overton daemon &                       # the arbiter must be up
overton ask ccmonitor claude-work      # should print `go`
# then trigger a heartbeat in Paperclip and check the run log for an
# `overton:` line
```

Force a refusal to see the other path — set the project's `weekly_share` to `0`
in `~/.overton/config.yaml` and trigger again. You should see `deny` and exit
`78`, with no tokens spent.

[paperclip]: https://github.com/paperclipai/paperclip
