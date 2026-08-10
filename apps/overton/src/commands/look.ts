/**
 * The looking commands. No decisions here — every number shown is read from the
 * same functions the gate uses, never recomputed.
 */

import { bar, humanDuration, table } from "@overton/core";
import { accountViews, ledgerView, openClaims, projectViews } from "@overton/engine";
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
    return emit(ctx, { accounts, projects }, () => {
      const acct = table(
        ["ACCOUNT", "PROVIDER", "PLAN", "7d", "5h", "READING", "CLAIMS"],
        accounts.map((a) => {
          const w7 = a.windows.find((w) => w.kind === "seven_day");
          const w5 = a.windows.find((w) => w.kind === "five_hour");
          return [
            a.accountId + (a.enabled ? "" : " (off)"),
            a.provider,
            a.plan ?? "—",
            w7 ? `${bar(w7.utilizationPct)} ${w7.utilizationPct.toFixed(0)}%` : a.metered ? "—" : "unmetered",
            w5 ? `${w5.utilizationPct.toFixed(0)}%` : "—",
            a.readingAgeSec == null ? "never" : `${humanDuration(a.readingAgeSec)} ago`,
            `${a.claims}/${a.maxConcurrent}`,
          ];
        }),
      );

      const rows: string[][] = [];
      for (const p of projects) {
        for (const a of p.accounts) {
          rows.push([
            p.projectId,
            a.accountId,
            `${a.sharePct.toFixed(0)}%`,
            `${a.used.toFixed(1)}/${a.allowance.toFixed(1)}`,
            a.pace,
            a.verdict + (a.retryAfterSec ? ` ${humanDuration(a.retryAfterSec)}` : ""),
          ]);
        }
      }
      const proj = table(["PROJECT", "ACCOUNT", "SHARE", "USED/ALLOWED", "PACE", "VERDICT"], rows);
      return `${acct}\n\n${proj}`;
    });
  },
};

const windows: Command = {
  run(ctx) {
    const [only] = ctx.args.positional;
    const accounts = accountViews(ctx.overton).filter((a) => !only || a.accountId === only);
    return emit(ctx, accounts, () => {
      const rows: string[][] = [];
      for (const a of accounts) {
        if (!a.windows.length) {
          rows.push([a.accountId, a.metered ? "(no reading)" : "unmetered", "", "", ""]);
          continue;
        }
        for (const w of a.windows) {
          rows.push([
            a.accountId,
            w.kind,
            `${bar(w.utilizationPct)} ${w.utilizationPct.toFixed(1)}%`,
            w.resetsIn ? `in ${w.resetsIn}` : "unknown",
            w.freshness,
          ]);
        }
      }
      return table(["ACCOUNT", "WINDOW", "USED", "RESETS", "FRESHNESS"], rows);
    });
  },
};

const projects: Command = {
  run(ctx) {
    const views = projectViews(ctx.overton);
    return emit(ctx, views, () => {
      const rows: string[][] = [];
      for (const p of views) {
        for (const a of p.accounts) {
          rows.push([
            p.projectId,
            a.accountId,
            `${a.sharePct.toFixed(0)}%`,
            a.alloc.toFixed(1),
            a.used.toFixed(1),
            a.allowance.toFixed(1),
            `${a.elapsedPct.toFixed(0)}%`,
            a.pace,
          ]);
        }
      }
      return table(
        ["PROJECT", "ACCOUNT", "SHARE", "ALLOC", "USED", "ALLOWED", "ELAPSED", "PACE"],
        rows,
      );
    });
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

    return emit(ctx, view, () => {
      const rows = view.rows.map((r) => [
        r.projectId,
        `${r.pct.toFixed(2)} pts`,
        r.proxy.toLocaleString(),
        `${r.confidencePct.toFixed(0)}%`,
      ]);
      const body = table(["PROJECT", "ATTRIBUTED", "OUTPUT TOKENS", "CONFIDENCE"], rows);

      // The comparison that says whether attribution is working at all. They
      // will not match exactly — the ledger starts when Overton does — but a
      // widening gap means a spend source is being missed.
      const gap =
        view.vendorPct != null
          ? `\n\nvendor says ${view.vendorPct.toFixed(1)}% · attributed ${view.attributed.toFixed(1)} pts` +
            `\n  the difference is spend from before this epoch was first observed, or from a source ` +
            `Overton cannot see`
          : "";
      return `${account} · ${view.windowKind} · epoch ${view.epochId ?? "none"}\n\n${body}${gap}`;
    });
  },
};

const claims: Command = {
  run(ctx) {
    const account = typeof ctx.args.flags.account === "string" ? ctx.args.flags.account : undefined;
    const rows = openClaims(ctx.overton.db, account);
    const now = ctx.overton.clock();
    return emit(ctx, rows, () =>
      rows.length
        ? table(
            ["CLAIM", "PROJECT", "ACCOUNT", "AGE", "LAST BEAT", "LABEL"],
            rows.map((c) => [
              c.id,
              c.projectId,
              c.accountId,
              humanDuration(now - c.openedAt),
              humanDuration(now - c.heartbeatAt) + " ago",
              c.label ?? "",
            ]),
          )
        : "no open claims",
    );
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
