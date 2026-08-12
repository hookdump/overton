/**
 * The looking commands. No decisions here — every number shown is read from the
 * same functions the gate uses, never recomputed.
 */

import { table } from "@overton/core";
import { accountViews, ledgerView, openClaims, projectViews } from "@overton/engine";
import {
  renderClaims,
  renderLedger,
  renderProjects,
  renderStatus,
  renderWindows,
} from "../render.ts";
import type { Command, CommandContext } from "./index.ts";

function emit(ctx: CommandContext, value: unknown, prose: () => string): number {
  if (ctx.args.flags.json) process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  else process.stdout.write(prose() + "\n");
  return 0;
}

const status: Command = {
  run(ctx) {
    const accounts = accountViews(ctx.overton);
    const projects = projectViews(ctx.overton);
    return emit(ctx, { accounts, projects }, () => renderStatus(accounts, projects));
  },
};

const windows: Command = {
  run(ctx) {
    const [only] = ctx.args.positional;
    const accounts = accountViews(ctx.overton).filter((a) => !only || a.accountId === only);
    return emit(ctx, accounts, () => renderWindows(accounts));
  },
};

const projects: Command = {
  run(ctx) {
    const views = projectViews(ctx.overton);
    return emit(ctx, views, () => renderProjects(views));
  },
};

const ledger: Command = {
  run(ctx) {
    const [account] = ctx.args.positional;
    if (!account) {
      process.stderr.write("usage: overton ledger <account> [--window seven_day|five_hour]\n");
      return 2;
    }
    const window = typeof ctx.args.flags.window === "string" ? ctx.args.flags.window : undefined;
    const view = ledgerView(ctx.overton, account, window);

    return emit(ctx, view, () => renderLedger(view));
  },
};

const claims: Command = {
  run(ctx) {
    const account = typeof ctx.args.flags.account === "string" ? ctx.args.flags.account : undefined;
    const rows = openClaims(ctx.overton.db, account);
    const now = ctx.overton.clock();
    return emit(ctx, rows, () => renderClaims(rows, now));
  },
};

const plugins: Command = {
  run(ctx) {
    const o = ctx.overton;
    const value = {
      providers: o.providers.all().map((p) => ({ id: p.id, description: p.description, metered: p.metered })),
      costSources: o.costSources.all().map((s) => ({ id: s.id, description: s.description })),
      policies: o.policies.all().map((p) => ({ id: p.id, description: p.description })),
      chain: o.cfg.policy.chain,
    };
    return emit(ctx, value, () => {
      const section = (title: string, rows: string[][]) =>
        `${title}\n${table(["ID", "DESCRIPTION"], rows)}`;
      return [
        section(
          "PROVIDERS",
          value.providers.map((p) => [p.id + (p.metered ? "" : " (unmetered)"), p.description]),
        ),
        section(
          "COST SOURCES",
          value.costSources.map((s) => [s.id, s.description]),
        ),
        section(
          "POLICIES",
          value.policies.map((p) => [
            p.id + (value.chain.includes(p.id) ? " *" : ""),
            p.description,
          ]),
        ),
        `\n* = in the active chain, which runs: ${value.chain.join(" → ")}`,
        `  (every policy rules; the worst verdict wins, so order affects only which is reported)`,
      ].join("\n\n");
    });
  },
};

export const lookCommands: Record<string, Command> = {
  status,
  windows,
  projects,
  ledger,
  claims,
  plugins,
};
