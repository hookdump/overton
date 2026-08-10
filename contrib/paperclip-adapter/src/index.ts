/**
 * Overton adapter for Paperclip.
 *
 * Paperclip enforces budgets in currency. On subscriptions the binding
 * constraint is a rolling plan window that several projects share, and no
 * amount of dollars unblocks a 7-day limit at 100%. This adapter adds that
 * missing half: every heartbeat asks Overton whether this project may spend on
 * this account right now, and only then runs the engine.
 *
 * @packageDocumentation
 */

import type { ServerAdapterModule } from "@paperclipai/adapter-utils";
import { ADAPTER_LABEL, ADAPTER_TYPE } from "./constants.js";
import { ENGINES } from "./engines.js";
import { execute } from "./server/execute.js";
import { testEnvironment } from "./server/test.js";
import { getConfigSchema } from "./server/config-schema.js";
import { getQuotaWindows } from "./server/quota.js";
import { sessionCodec } from "./server/session.js";

export const type = ADAPTER_TYPE;
export const label = ADAPTER_LABEL;

/**
 * Models are not curated here.
 *
 * This adapter fronts three engines whose model lists move independently and
 * faster than any list shipped in a package. The `model` field is free text and
 * is passed through; an empty value uses the engine's own default, which is the
 * behaviour that stays correct without updates.
 */
export const models: { id: string; label: string }[] = [];

/**
 * Shown in the Paperclip UI, and written as routing logic rather than marketing
 * copy: an LLM deciding whether to hire this adapter should be able to tell
 * from this whether it fits.
 */
export const agentConfigurationDoc = `# Overton (budget-gated)

Runs Claude Code, Codex or Ollama — but only when [Overton](https://github.com/hookdump/overton)
agrees the subscription can afford it.

## Use when

- Several agents, companies or repos share one Claude/Codex subscription and you
  need a share of the **plan window** allocated per project.
- You want an agent to stop on a 5h/7d limit rather than on a dollar figure.
- You are running unattended overnight and a refusal must be a quiet no-op with
  a retry time, not a burned turn.

## Don't use when

- The agent is billed per-token on an API key. Paperclip's own monthly budget
  already governs that, and this adds a dependency for nothing.
- You have no Overton daemon. This adapter **fails closed**: with no arbiter
  reachable it skips the heartbeat rather than running unmetered.

## Prerequisites

1. Overton installed and configured (\`overton init\`, then \`overton doctor\`).
2. The daemon running: \`overton daemon\` (HTTP on 127.0.0.1:7787).
3. An Overton project and account for this agent (\`overton status\` lists them).

## Core configuration

| Field | Type | Default | Description |
|---|---|---|---|
| account | string | — | **Required.** Overton account to spend from, e.g. \`claude-personal\`. |
| project | string | company id | Whose share of the account this agent spends. |
| engine | select | claude | \`claude\`, \`codex\` or \`ollama\`. |
| model | string | (engine default) | Passed through to the engine. |
| overtonUrl | string | http://127.0.0.1:7787 | Where the arbiter listens. |
| force | boolean | false | Run even when refused. Recorded, and counted against the next window. |

## Engine configuration

| Field | Type | Description |
|---|---|---|
| command | string | Binary to run. Blank uses \`claude\` / \`codex\` / \`ollama\`. |
| configDir | string | \`CLAUDE_CONFIG_DIR\` for this seat. Should match the Overton account. |
| codexHome | string | \`CODEX_HOME\` for this seat. Same reasoning. |
| cwd | string | Working directory. Also how Overton attributes spend to a project. |
| timeoutSec | number | 0 for none. |
| persistSession | boolean | Resume the previous session across heartbeats. |
| dangerouslySkipPermissions | boolean | Required for genuinely unattended runs. |

## What a refusal looks like

The heartbeat exits non-zero **without starting the engine**, and the run log
carries the reason and the remedies:

    overton: wait — sideproject is over its weekly allocation on claude-personal
      project   sideproject  alloc 17.5 pts  used 21.3 pts
      clock     32% of the window elapsed → allowance 6.4 pts
      → try --account claude-work (2.1 of 40.0 pts used)
      retry in ~252 min

Exit \`75\` means the window will reopen; \`78\` means the pairing is not allowed
at all and waiting will not change it. No tokens are spent either way.

## Match the seat to the account

If \`account\` names your personal Claude seat, \`configDir\` must point at the
personal profile. Gating on one subscription while spending from another makes
every number downstream wrong, and nothing will complain — the environment test
warns when the pairing is unset.
`;

/**
 * The entrypoint Paperclip's adapter manager looks for.
 */
export function createServerAdapter(): ServerAdapterModule {
  return {
    type: ADAPTER_TYPE,
    execute,
    testEnvironment,
    getConfigSchema,
    // Surfaces every Overton account's real windows in Paperclip's own quota
    // view, so the budget that governs these agents is visible where the agents
    // are managed rather than only in a terminal.
    getQuotaWindows: () => getQuotaWindows(),
    sessionCodec,
    models,
    agentConfigurationDoc,
    // Opt in: external plugins default to off, and an AGENTS.md bundle is how a
    // Paperclip agent carries its standing instructions between heartbeats.
    supportsInstructionsBundle: true,
    instructionsPathKey: "instructionsFilePath",
  };
}

export { ENGINES };
export default createServerAdapter;
