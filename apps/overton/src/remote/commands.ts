/**
 * The commands, answered by another Overton.
 *
 * Two rules govern everything here.
 *
 * NOTHING FALLS BACK. If the remote cannot be reached, the command fails and
 * says so. A `status` table quietly rendered from this machine's stale database
 * while the operator believes they are looking at the shared arbiter is the
 * worst outcome available: every number is wrong and nothing on the screen
 * admits it.
 *
 * THE OUTPUT IS THE SAME OUTPUT. `--json` shapes are byte-for-byte what the
 * local path prints — the wire format is massaged here where the HTTP surface
 * differs (it adds `exitCode` to a decision, and always spells out `forced`) so
 * that a script cannot tell which Overton answered. The prose tables come from
 * `../render.ts`, which the local commands also use.
 *
 * The verdict exit codes are the contract that matters most: `overton ask`
 * exits 0/10/11/12 whether the decision was made here or two hops away.
 */

import { EXIT_CODE, renderDecision, type Decision } from "@overton/core";
import type { ParsedArgs } from "../index.ts";
import {
  renderClaims,
  renderLedger,
  renderProjects,
  renderSplit,
  renderStatus,
  renderWindows,
} from "../render.ts";
import { RemoteError, RemoteOverton, type ConfigEditResult } from "./client.ts";
import { describeTarget, targetHost, type RemoteTarget } from "./target.ts";

interface RemoteContext {
  args: ParsedArgs;
  remote: RemoteOverton;
  target: RemoteTarget;
}

type RemoteCommand = (ctx: RemoteContext) => number | Promise<number>;

function emit(ctx: RemoteContext, value: unknown, prose: () => string): number {
  if (ctx.args.flags.json) process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  else process.stdout.write(prose() + "\n");
  return 0;
}

// ---------------------------------------------------------------------------
// deciding
// ---------------------------------------------------------------------------

const ask: RemoteCommand = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project) {
    process.stderr.write("usage: overton ask <project> [account]\n");
    return 2;
  }

  if (!account) {
    const { decisions } = await ctx.remote.askAll(project);
    if (!decisions.length) {
      process.stderr.write(`${project} names no accounts in config\n`);
      return 2;
    }
    emit(ctx, decisions, () => decisions.map(renderDecision).join("\n\n"));
    return EXIT_CODE[decisions[0]!.verdict];
  }

  // The route returns the decision WITH `exitCode`; the local path prints a
  // decision without one. Stripping it keeps `--json` identical, and using it
  // for the process's own exit keeps the arbiter — not this client — the
  // authority on what a verdict is worth.
  const { exitCode, ...decision } = await ctx.remote.ask(project, account);
  emit(ctx, decision, () => renderDecision(decision as Decision));
  return exitCode;
};

/** `--label`, and the `force` flag, shared by `claim` and `run`. */
function claimBody(ctx: RemoteContext, label: string | null) {
  return {
    project: ctx.args.positional[0]!,
    account: ctx.args.positional[1]!,
    label,
    // No `pid`: the field exists so a human can reconcile a claim against a
    // process table, and a pid from another machine points at whatever
    // unrelated process happens to hold that number over there. A number that
    // looks local and is not is worse than the null.
    force: ctx.args.flags.force === true,
  };
}

const claim: RemoteCommand = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project || !account) {
    process.stderr.write("usage: overton claim <project> <account> [--label X] [--force]\n");
    return 2;
  }
  const res = await ctx.remote.claim(
    claimBody(ctx, typeof ctx.args.flags.label === "string" ? ctx.args.flags.label : null),
  );

  if (ctx.args.flags.json) {
    // The engine returns `{decision, claim: null}` for a refusal and adds
    // `forced` only when it opened one; the HTTP route always spells `forced`
    // out. Reshaped so the two are the same document.
    const value = res.claim ? { decision: res.decision, claim: res.claim, forced: res.forced } : { decision: res.decision, claim: null };
    process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  } else if (res.claim) {
    process.stdout.write(
      `${res.claim.id}\n` + (res.forced ? `  FORCED past: ${res.decision.summary}\n` : ""),
    );
  } else {
    process.stdout.write(renderDecision(res.decision) + "\n");
  }
  return res.claim ? 0 : EXIT_CODE[res.decision.verdict];
};

const renew: RemoteCommand = async (ctx) => {
  const [id] = ctx.args.positional;
  if (!id) {
    process.stderr.write("usage: overton renew <claim-id>\n");
    return 2;
  }
  try {
    await ctx.remote.renew(id);
    return 0;
  } catch (e) {
    // 404 is the arbiter answering, not a transport failure: the claim was
    // reaped, and the caller has to stop believing it holds a slot.
    if (e instanceof RemoteError && e.status === 404) {
      process.stderr.write(`no open claim \`${id}\` — it may have been reaped\n`);
      return 1;
    }
    throw e;
  }
};

const release: RemoteCommand = async (ctx) => {
  const [id] = ctx.args.positional;
  if (!id) {
    process.stderr.write("usage: overton release <claim-id>\n");
    return 2;
  }
  try {
    await ctx.remote.release(id);
    return 0;
  } catch (e) {
    if (e instanceof RemoteError && e.status === 404) {
      process.stderr.write(`no open claim \`${id}\`\n`);
      return 1;
    }
    throw e;
  }
};

const run: RemoteCommand = async (ctx) => {
  const [project, account] = ctx.args.positional;
  if (!project || !account || ctx.args.rest.length === 0) {
    process.stderr.write("usage: overton run <project> <account> -- <command>...\n");
    return 2;
  }

  // The lease belongs to the arbiter, so the heartbeat interval is derived from
  // ITS policy rather than from whatever this machine's config happens to say.
  const cfg = await ctx.remote.config();
  const res = await ctx.remote.claim(claimBody(ctx, ctx.args.rest.join(" ").slice(0, 120)));
  if (!res.claim) {
    process.stderr.write(renderDecision(res.decision) + "\n");
    return EXIT_CODE[res.decision.verdict];
  }

  const id = res.claim.id;
  const beat = setInterval(
    () => {
      // A missed beat is survivable — the reaper is the backstop — but it is
      // reported, because the failure a long run cannot recover from is losing
      // its claim without ever hearing about it.
      void ctx.remote.renew(id).catch((e: Error) => {
        process.stderr.write(`overton: heartbeat failed: ${e.message}\n`);
      });
    },
    Math.max(5, cfg.policy.claim_lease_sec / 3) * 1000,
  );

  try {
    const proc = Bun.spawn(ctx.args.rest, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
    return await proc.exited;
  } finally {
    clearInterval(beat);
    // Released in `finally` so a crash, a signal or a non-zero exit all give
    // the capacity back. Held capacity on a remote arbiter idles the account
    // for every other machine too, not just this one.
    await ctx.remote.release(id).catch((e: Error) => {
      process.stderr.write(`overton: could not release ${id}: ${e.message}\n`);
    });
  }
};

// ---------------------------------------------------------------------------
// looking
// ---------------------------------------------------------------------------

const status: RemoteCommand = async (ctx) => {
  const [accounts, projects] = await Promise.all([ctx.remote.accounts(), ctx.remote.projects()]);
  return emit(ctx, { accounts, projects }, () => renderStatus(accounts, projects));
};

const windows: RemoteCommand = async (ctx) => {
  const [only] = ctx.args.positional;
  const accounts = (await ctx.remote.accounts()).filter((a) => !only || a.accountId === only);
  return emit(ctx, accounts, () => renderWindows(accounts));
};

const projects: RemoteCommand = async (ctx) => {
  const views = await ctx.remote.projects();
  return emit(ctx, views, () => renderProjects(views));
};

const ledger: RemoteCommand = async (ctx) => {
  const [account] = ctx.args.positional;
  if (!account) {
    process.stderr.write("usage: overton ledger <account> [--window seven_day|five_hour]\n");
    return 2;
  }
  const view = await ctx.remote.ledger(
    account,
    typeof ctx.args.flags.window === "string" ? ctx.args.flags.window : undefined,
  );
  return emit(ctx, view, () => renderLedger(view));
};

const claims: RemoteCommand = async (ctx) => {
  const account = typeof ctx.args.flags.account === "string" ? ctx.args.flags.account : undefined;
  // `health` only for its clock: ages are relative to the host holding the
  // claims, and this machine's clock is not that one.
  const [rows, health] = await Promise.all([ctx.remote.claims(account), ctx.remote.health()]);
  return emit(ctx, rows, () => renderClaims(rows, health.now));
};

// ---------------------------------------------------------------------------
// project
// ---------------------------------------------------------------------------

/** `--account claude-work=2` / `--account ollama` → [id, weight]. */
function parseAccountSpec(spec: string): [string, number] | null {
  const eq = spec.indexOf("=");
  if (eq < 0) return [spec, 1];
  const weight = Number(spec.slice(eq + 1));
  if (!Number.isFinite(weight) || weight < 0) return null;
  return [spec.slice(0, eq), weight];
}

function listFlag(ctx: RemoteContext, name: string): string[] {
  const v = ctx.args.flags[name];
  if (typeof v !== "string") return [];
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

const project: RemoteCommand = async (ctx) => {
  const sub = ctx.args.positional.shift();
  if (sub === "ensure" || sub === "add") return projectEnsure(ctx);
  if (sub === "rm" || sub === "remove") return projectRm(ctx);
  if (!sub || sub === "ls" || sub === "list") {
    const cfg = await ctx.remote.config();
    const ids = Object.keys(cfg.projects);
    process.stdout.write(ids.length ? ids.join("\n") + "\n" : "no projects configured\n");
    return 0;
  }
  process.stderr.write(
    `unknown subcommand \`${sub}\`\n\n` +
      "usage:\n" +
      "  overton project ls\n" +
      "  overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,…]]\n" +
      "  overton project rm <id>\n",
  );
  return 2;
};

async function projectEnsure(ctx: RemoteContext): Promise<number> {
  const [projectId] = ctx.args.positional;
  if (!projectId) {
    process.stderr.write(
      "usage: overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,ID=WEIGHT]]\n",
    );
    return 2;
  }

  const roots = listFlag(ctx, "root");
  const accounts: Array<[string, number]> = [];
  for (const spec of listFlag(ctx, "account")) {
    const parsed = parseAccountSpec(spec);
    if (!parsed) {
      process.stderr.write(`\`${spec}\` — weight must be a number >= 0\n`);
      return 1;
    }
    accounts.push(parsed);
  }

  const cfg = await ctx.remote.config();
  for (const [accountId] of accounts) {
    if (!cfg.accounts[accountId]) {
      process.stderr.write(
        `no account \`${accountId}\` — known: ${Object.keys(cfg.accounts).join(", ")}\n`,
      );
      return 2;
    }
  }

  const existing = cfg.projects[projectId];
  let result: ConfigEditResult | null = null;
  try {
    if (!existing) {
      result = await ctx.remote.addProject({ id: projectId, roots, accounts: Object.fromEntries(accounts) });
    } else {
      // Additive, exactly as the local path is: an `ensure` that dropped the
      // roots or accounts a project already had would be a destructive command
      // wearing a safe name.
      if (roots.length) {
        const merged = [...new Set([...existing.roots, ...roots])];
        if (merged.length !== existing.roots.length) result = await ctx.remote.setProjectRoots(projectId, merged);
      }
      for (const [accountId, weight] of accounts) {
        result = await ctx.remote.setShare(projectId, accountId, weight);
      }
    }
  } catch (e) {
    if (e instanceof RemoteError && e.status != null) {
      process.stderr.write(`${e.message}\n`);
      return 1;
    }
    throw e;
  }

  process.stdout.write(
    `${existing ? "updated" : "created"} project \`${projectId}\`` +
      (roots.length ? ` · roots ${roots.join(", ")}` : "") +
      (accounts.length ? ` · ${accounts.map(([a, w]) => `${a}=${w}`).join(" ")}` : "") +
      "\n\n",
  );
  if (!roots.length && !existing) {
    process.stdout.write(
      "note: no --root given, so nothing will be attributed to this project. " +
        "Spend from a directory you have not declared lands in @interactive.\n\n",
    );
  }
  // The edit route echoes the allocation it just wrote. Asking `/v1/projects`
  // again would be answered by whatever config the server has resolved, which
  // for a plain `overton serve` is still the one it started with.
  process.stdout.write(renderSplit(result?.projects ?? (await ctx.remote.projects()), projectId) + "\n");
  return 0;
}

async function projectRm(ctx: RemoteContext): Promise<number> {
  const [projectId] = ctx.args.positional;
  if (!projectId) {
    process.stderr.write("usage: overton project rm <id>\n");
    return 2;
  }
  let result: ConfigEditResult;
  try {
    result = await ctx.remote.removeProject(projectId);
  } catch (e) {
    if (e instanceof RemoteError && e.status != null) {
      process.stderr.write(`${e.message}\n`);
      return 1;
    }
    throw e;
  }
  process.stdout.write(`removed \`${projectId}\` — its allocation returns to the other projects\n\n`);
  process.stdout.write(renderSplit(result.projects, projectId) + "\n");
  return 0;
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

export const REMOTE_COMMANDS: Record<string, RemoteCommand> = {
  ask,
  claim,
  renew,
  release,
  run,
  status,
  windows,
  projects,
  ledger,
  claims,
  project,
};

/**
 * The commands that stay on this machine, and why.
 *
 * `where` decides which advice the refusal ends with: `host` for work that
 * belongs to whoever holds the database and the credentials, `here` for work
 * that is about this machine and would be wrong to do anywhere else.
 *
 * Nothing is quietly run locally instead. A `meter` that silently metered THIS
 * host while pointed at another would write its numbers into the wrong ledger,
 * so every one of these is a refusal with a reason.
 */
export const LOCAL_ONLY: Record<string, { why: string; where: "host" | "here" }> = {
  explain: {
    why: "the facts behind a decision are not on the HTTP surface — a remote can say what it decided, not show its working",
    where: "host",
  },
  meter: {
    why: "metering polls the vendors with the credentials on the machine it runs on, and writes that machine's ledger",
    where: "host",
  },
  daemon: { why: "the daemon owns a database and binds a port", where: "host" },
  serve: { why: "serving means binding a port to a local database", where: "host" },
  mcp: { why: "the MCP server answers from the database in the process running it", where: "host" },
  doctor: { why: "doctor checks the provider credentials on the machine it runs on", where: "host" },
  plugins: {
    why: "the plugin registry belongs to the binary that loaded it, and is not on the HTTP surface",
    where: "host",
  },
  init: { why: "init writes this machine's config file", where: "here" },
  paperclip: { why: "the adapter is built and registered on this machine", where: "here" },
};

function refuseLocalOnly(command: string, target: RemoteTarget): number {
  const entry = LOCAL_ONLY[command];
  const why = entry?.why ?? "it has no remote equivalent";
  const fix =
    entry?.where === "here"
      ? `  fix: it is about this machine, so drop the remote (${target.source}) and run it again`
      : `  fix: run it on the arbiter itself — ssh ${targetHost(target)} overton ${command} …`;
  process.stderr.write(
    `overton: \`${command}\` cannot run against a remote Overton (${describeTarget(target)})\n` +
      `  ${why}\n${fix}\n`,
  );
  return 2;
}

/**
 * Say which Overton answered.
 *
 * On stderr, not stdout, so that stdout stays byte-identical to local mode:
 * `id=$(overton claim …)` and anything piping a table into `awk` must not start
 * behaving differently because a remote was configured. Suppressed under
 * `--json`, where one extra byte would corrupt the document. Dim when a human
 * is watching; plain when it is going into a log.
 */
function banner(target: RemoteTarget): void {
  const line = `overton · ${describeTarget(target)}`;
  process.stderr.write(process.stderr.isTTY ? `\x1b[2m${line}\x1b[0m\n` : `${line}\n`);
}

/** Every command dispatched in remote mode goes through here. */
export async function runRemote(target: RemoteTarget, args: ParsedArgs): Promise<number> {
  const command = REMOTE_COMMANDS[args.command];
  if (!command) return refuseLocalOnly(args.command, target);

  if (!args.flags.json) banner(target);

  const ctx: RemoteContext = { args, remote: new RemoteOverton(target.url), target };
  try {
    return await command(ctx);
  } catch (e) {
    if (e instanceof RemoteError) {
      // Named in full, and stated as a refusal rather than a warning: the
      // alternative a reader might assume — that it fell back to the local
      // database — is precisely what did not happen.
      process.stderr.write(
        `overton: ${e.message}\n` +
          `  the remote (${describeTarget(target)}, from ${target.source}) is where this question had to go,\n` +
          "  so nothing was answered from this machine's database.\n",
      );
      return 1;
    }
    throw e;
  }
}
