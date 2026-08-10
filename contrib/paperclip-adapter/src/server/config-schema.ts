/**
 * The agent configuration form, declared rather than drawn.
 *
 * `getConfigSchema` is resolved server-side and may do IO, so the account
 * dropdown is populated from the live Overton instance. That turns the most
 * common misconfiguration — a mistyped account name that only surfaces at 03:00
 * — into a list you pick from.
 */

import type { AdapterConfigSchema, ConfigFieldOption } from "@paperclipai/adapter-utils";
import { OvertonClient } from "../overton.js";
import { ENGINES } from "../engines.js";
import { DEFAULT_OVERTON_URL } from "../constants.js";

export async function getConfigSchema(): Promise<AdapterConfigSchema> {
  let accountOptions: ConfigFieldOption[] = [];
  let projectOptions: ConfigFieldOption[] = [];
  let accountHint =
    "Which subscription to spend from. Overton is not reachable, so this is free text — check `overton status`.";

  try {
    const accounts = await new OvertonClient(DEFAULT_OVERTON_URL).accounts();
    accountOptions = accounts.map((a) => {
      const seven = a.windows.find((w) => w.kind === "seven_day");
      return {
        value: a.accountId,
        label: seven
          ? `${a.accountId} — ${a.provider}, 7d ${seven.utilizationPct.toFixed(0)}% used`
          : `${a.accountId} — ${a.provider}${a.metered ? "" : ", unmetered"}`,
        group: a.provider,
      };
    });
    if (accountOptions.length) accountHint = "Which subscription this agent spends from.";

    const cfg = await new OvertonClient(DEFAULT_OVERTON_URL).config();
    projectOptions = Object.entries(cfg.projects ?? {}).map(([id, p]) => ({
      value: id,
      label: `${id}${p.accounts ? ` — ${Object.keys(p.accounts).join(", ")}` : ""}`,
    }));
  } catch {
    // Not fatal. The field degrades to free text rather than blocking the form
    // — a user configuring an agent before starting the daemon is a normal
    // order of operations, not an error.
  }

  return {
    fields: [
      {
        key: "account",
        label: "Overton account",
        type: accountOptions.length ? "select" : "text",
        options: accountOptions.length ? accountOptions : undefined,
        required: true,
        hint: accountHint,
        group: "Budget",
      },
      {
        key: "project",
        label: "Overton project",
        // A combobox rather than a select: pick an existing project, or type a
        // new name. Typing one does not create it — allocating budget as a side
        // effect of saving a form is exactly the kind of silent magic this
        // system exists to avoid — so the environment test names the one
        // command that does.
        type: projectOptions.length ? "combobox" : "text",
        options: projectOptions.length ? projectOptions : undefined,
        hint: projectOptions.length
          ? "Whose share of the account this spends. Pick one, or type a new name and create it with `overton project ensure <name>`."
          : "Whose share of the account this spends. Defaults to the Paperclip company id.",
        group: "Budget",
      },
      {
        key: "overtonUrl",
        label: "Overton URL",
        type: "text",
        default: DEFAULT_OVERTON_URL,
        hint: "Where the arbiter listens. Loopback by default.",
        group: "Budget",
      },
      {
        key: "force",
        label: "Ignore the budget",
        type: "toggle",
        default: false,
        hint: "Run even when Overton refuses. The override is recorded and counted against the next window. Per-agent on purpose.",
        group: "Budget",
      },

      {
        key: "engine",
        label: "Engine",
        type: "select",
        default: "claude",
        required: true,
        options: Object.values(ENGINES).map((e) => ({ value: e.id, label: e.label })),
        hint: "Which CLI runs once the gate says go.",
        group: "Engine",
      },
      // `command` and `model` are deliberately NOT declared here. Paperclip
      // renders those two generically, above the adapter's own fields, and
      // re-declaring them binds two inputs to one config key — the user edits
      // one and the other silently disagrees.
      {
        key: "configDir",
        label: "Claude profile directory (override)",
        type: "text",
        hint: "Leave blank — the seat is inherited from the Overton account above. Set this only to override it with a different profile.",
        group: "Engine",
      },
      {
        key: "codexHome",
        label: "Codex home (override)",
        type: "text",
        hint: "Leave blank — inherited from the Overton account above. Set this only to override it.",
        group: "Engine",
      },

      {
        key: "cwd",
        label: "Working directory",
        type: "text",
        hint: "Where the engine runs. Also how Overton attributes the spend to a project, via that project's roots.",
        group: "Execution",
      },
      {
        key: "timeoutSec",
        label: "Timeout (seconds)",
        type: "number",
        default: 0,
        hint: "0 means no timeout.",
        group: "Execution",
      },
      {
        key: "graceSec",
        label: "Grace period (seconds)",
        type: "number",
        default: 15,
        hint: "Time between SIGTERM and SIGKILL on timeout.",
        group: "Execution",
      },
      {
        key: "persistSession",
        label: "Resume sessions",
        type: "toggle",
        default: true,
        hint: "Continue the previous session across heartbeats where the engine supports it.",
        group: "Execution",
      },
      {
        key: "dangerouslySkipPermissions",
        label: "Skip permission prompts",
        type: "toggle",
        default: false,
        hint: "Required for genuinely unattended runs. The engine will not ask before acting.",
        group: "Execution",
      },
    ],
  };
}
