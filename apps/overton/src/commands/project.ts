/**
 * Managing projects from the CLI.
 *
 * `ensure` exists because the useful thing to put in an error message is a
 * command that is safe to paste twice. Every failure that told someone to "add
 * projects.X.accounts.Y to config.yaml" was asking them to hand-edit YAML —
 * which is how two of this project's worst afternoons started.
 */

import { ConfigError, loadConfigDoc, saveConfigDoc, setShare } from "@overton/core";
import { addProject, removeProject, setProjectRoots } from "@overton/core";
import { Overton, projectViews } from "@overton/engine";
import { renderSplit } from "../render.ts";
import type { Command, CommandContext } from "./index.ts";

/** `--account claude-work=2` / `--account ollama` → [id, weight]. */
function parseAccountSpec(spec: string): [string, number] {
  const eq = spec.indexOf("=");
  if (eq < 0) return [spec, 1];
  const weight = Number(spec.slice(eq + 1));
  if (!Number.isFinite(weight) || weight < 0) {
    throw new ConfigError(`\`${spec}\` — weight must be a number >= 0`);
  }
  return [spec.slice(0, eq), weight];
}

function listFlag(ctx: CommandContext, name: string): string[] {
  const v = ctx.args.flags[name];
  if (typeof v !== "string") return [];
  // Repeated flags collapse to the last value, so a comma-separated list is the
  // form that always works.
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

function showSplit(ctx: CommandContext, projectId: string): void {
  // Rebuilt from the config just written, so the numbers are the ones the gate
  // will use rather than the ones it used a moment ago.
  const cfg = ctx.overton.cfg;
  void cfg;
  const fresh = new Overton({
    db: ctx.overton.db,
    cfg: ctx.overton.cfg,
    configFile: ctx.overton.configFile ?? undefined,
  });
  process.stdout.write(renderSplit(projectViews(fresh), projectId) + "\n");
}

/**
 * Create a project, or bring an existing one up to the stated shape.
 *
 * Idempotent on purpose: it is meant to be pasted out of an error message by
 * someone who does not know whether the project already exists, and running it
 * twice must not be a mistake.
 */
const ensure: Command = {
  run(ctx) {
    const [projectId] = ctx.args.positional;
    if (!projectId) {
      process.stderr.write(
        "usage: overton project ensure <id> [--root PATH[,PATH]] [--account ID[=WEIGHT][,ID=WEIGHT]]\n",
      );
      return 2;
    }
    if (!ctx.overton.configFile) {
      process.stderr.write("no config file to edit\n");
      return 2;
    }

    const roots = listFlag(ctx, "root");
    const accounts = listFlag(ctx, "account").map(parseAccountSpec);
    for (const [accountId] of accounts) {
      if (!ctx.overton.cfg.accounts[accountId]) {
        process.stderr.write(
          `no account \`${accountId}\` — known: ${Object.keys(ctx.overton.cfg.accounts).join(", ")}\n`,
        );
        return 2;
      }
    }

    const existed = !!ctx.overton.cfg.projects[projectId];
    try {
      const cd = loadConfigDoc(ctx.overton.configFile);
      if (!existed) {
        addProject(cd, { id: projectId, roots, accounts: Object.fromEntries(accounts) });
      } else {
        // Additive. An `ensure` that silently dropped roots or accounts the
        // project already had would be a destructive command wearing a safe name.
        if (roots.length) {
          const current = ctx.overton.cfg.projects[projectId]!.roots;
          const merged = [...new Set([...current, ...roots])];
          if (merged.length !== current.length) setProjectRoots(cd, projectId, merged);
        }
        for (const [accountId, weight] of accounts) setShare(cd, projectId, accountId, weight);
      }
      saveConfigDoc(cd);
    } catch (e) {
      process.stderr.write(`${(e as Error).message}\n`);
      return 1;
    }

    process.stdout.write(
      `${existed ? "updated" : "created"} project \`${projectId}\`` +
        (roots.length ? ` · roots ${roots.join(", ")}` : "") +
        (accounts.length ? ` · ${accounts.map(([a, w]) => `${a}=${w}`).join(" ")}` : "") +
        "\n\n",
    );
    if (!roots.length && !existed) {
      process.stdout.write(
        "note: no --root given, so nothing will be attributed to this project. " +
          "Spend from a directory you have not declared lands in @interactive.\n\n",
      );
    }
    showSplit(ctx, projectId);
    return 0;
  },
};

const rm: Command = {
  run(ctx) {
    const [projectId] = ctx.args.positional;
    if (!projectId) {
      process.stderr.write("usage: overton project rm <id>\n");
      return 2;
    }
    if (!ctx.overton.configFile) {
      process.stderr.write("no config file to edit\n");
      return 2;
    }
    try {
      const cd = loadConfigDoc(ctx.overton.configFile);
      removeProject(cd, projectId);
      saveConfigDoc(cd);
    } catch (e) {
      process.stderr.write(`${(e as Error).message}\n`);
      return 1;
    }
    process.stdout.write(`removed \`${projectId}\` — its allocation returns to the other projects\n\n`);
    showSplit(ctx, projectId);
    return 0;
  },
};

/** `overton project …` — dispatches to the subcommands above. */
export const projectCommand: Command = {
  run(ctx) {
    const sub = ctx.args.positional.shift();
    if (sub === "ensure" || sub === "add") return ensure.run(ctx);
    if (sub === "rm" || sub === "remove") return rm.run(ctx);
    if (!sub || sub === "ls" || sub === "list") {
      const ids = Object.keys(ctx.overton.cfg.projects);
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
  },
};
