/**
 * The deciding commands.
 *
 * Exit codes carry the verdict, so a shell script can branch without parsing
 * prose:
 *
 *   overton ask sideproject claude-personal || case $? in
 *     10) sleep "$(overton ask ... --json | jq .retryAfterSec)" ;;
 *     12) echo "never on this account"; exit 1 ;;
 *   esac
 */

import { EXIT_CODE, renderDecision } from "@overton/core";
import type { Command, CommandContext } from "./index.ts";

function out(ctx: CommandContext, value: unknown, prose: string): void {
  if (ctx.args.flags.json) process.stdout.write(JSON.stringify(value, null, 2) + "\n");
  else process.stdout.write(prose + "\n");
}

const ask: Command = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project) {
      process.stderr.write("usage: overton ask <project> [account]\n");
      return 2;
    }

    if (!account) {
      // Compare every account this project may use. The first line is the
      // recommendation; the rest are why the others were not it.
      const all = ctx.overton.askAll(project);
      if (!all.length) {
        process.stderr.write(`${project} names no accounts in config\n`);
        return 2;
      }
      out(ctx, all, all.map(renderDecision).join("\n\n"));
      return EXIT_CODE[all[0]!.verdict];
    }

    const decision = ctx.overton.ask(project, account);
    out(ctx, decision, renderDecision(decision));
    return EXIT_CODE[decision.verdict];
  },
};

const explain: Command = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account) {
      process.stderr.write("usage: overton explain <project> <account>\n");
      return 2;
    }
    const facts = ctx.overton.facts(project, account);
    const decision = ctx.overton.ask(project, account, { record: false });

    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify({ decision, facts }, null, 2) + "\n");
      return 0;
    }

    const lines = [
      renderDecision(decision),
      "",
      `account      ${facts.accountId}  provider ${facts.reading?.provider ?? "?"}  ` +
        `${facts.metered ? "metered" : "unmetered"}`,
      `reading      ${facts.reading ? `${facts.reading.freshness}, ts ${facts.reading.ts}` : "none"}`,
      `claims       ${facts.claims.project} by this project, ${facts.claims.account} on the account ` +
        `(max ${facts.account.max_concurrent})`,
      `shares       weekly ${(facts.shares.weekly * 100).toFixed(0)}%  ` +
        `5h ${(facts.shares.fiveHour * 100).toFixed(0)}%`,
      "",
    ];
    for (const w of facts.windows) {
      lines.push(
        `${w.window}  mode ${w.mode}  ${w.reported ? `${w.reading?.utilizationPct.toFixed(0)}% account-wide` : "not reported by vendor"}`,
        `  alloc ${w.alloc.toFixed(2)} pts · used ${w.used.toFixed(2)} · allowance ${w.allowance.toFixed(2)} · ` +
          `elapsed ${(w.elapsed * 100).toFixed(0)}%`,
        `  freshness ${w.freshness}${w.staleAdjustment ? ` · stale adjustment +${w.staleAdjustment.toFixed(2)} pts` : ""}` +
          `${w.blocked ? ` · BLOCKED: ${w.blocked}` : ""}`,
      );
    }
    lines.push("", "rulings");
    for (const r of decision.rulings) lines.push(`  ${r.policy.padEnd(16)} ${r.verdict}  ${r.summary}`);
    if (!decision.rulings.length) lines.push("  (every policy had no opinion — nothing stood in the way)");

    process.stdout.write(lines.join("\n") + "\n");
    return 0;
  },
};

const claim: Command = {
  run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account) {
      process.stderr.write("usage: overton claim <project> <account> [--label X] [--force]\n");
      return 2;
    }
    const res = ctx.overton.claim(
      {
        projectId: project,
        accountId: account,
        label: typeof ctx.args.flags.label === "string" ? ctx.args.flags.label : null,
        pid: process.ppid,
      },
      { force: ctx.args.flags.force === true },
    );

    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    } else if (res.claim) {
      process.stdout.write(
        `${res.claim.id}\n` + (res.forced ? `  FORCED past: ${res.decision.summary}\n` : ""),
      );
    } else {
      process.stdout.write(renderDecision(res.decision) + "\n");
    }
    return res.claim ? 0 : EXIT_CODE[res.decision.verdict];
  },
};

const renew: Command = {
  run(ctx) {
    const [id] = ctx.args.positional;
    if (!id) {
      process.stderr.write("usage: overton renew <claim-id>\n");
      return 2;
    }
    if (ctx.overton.renew(id)) return 0;
    // Non-zero, loudly: a caller renewing a reaped claim has lost its capacity
    // and must stop believing it holds a slot.
    process.stderr.write(`no open claim \`${id}\` — it may have been reaped\n`);
    return 1;
  },
};

const release: Command = {
  run(ctx) {
    const [id] = ctx.args.positional;
    if (!id) {
      process.stderr.write("usage: overton release <claim-id>\n");
      return 2;
    }
    if (ctx.overton.release(id)) return 0;
    process.stderr.write(`no open claim \`${id}\`\n`);
    return 1;
  },
};

/**
 * `overton run <project> <account> -- <cmd>...`
 *
 * The whole lifecycle in one invocation, which is how most people should use
 * this: ask, hold a claim, run the command, release even if it fails. The
 * heartbeat runs on a timer so a long command is not reaped mid-flight.
 */
const run: Command = {
  async run(ctx) {
    const [project, account] = ctx.args.positional;
    if (!project || !account || ctx.args.rest.length === 0) {
      process.stderr.write("usage: overton run <project> <account> -- <command>...\n");
      return 2;
    }

    const res = ctx.overton.claim(
      { projectId: project, accountId: account, label: ctx.args.rest.join(" ").slice(0, 120), pid: process.pid },
      { force: ctx.args.flags.force === true },
    );
    if (!res.claim) {
      process.stderr.write(renderDecision(res.decision) + "\n");
      return EXIT_CODE[res.decision.verdict];
    }

    const leaseSec = ctx.overton.cfg.policy.claim_lease_sec;
    // A third of the lease: two consecutive missed beats still leave headroom
    // before the reaper takes the claim.
    const beat = setInterval(() => ctx.overton.renew(res.claim!.id), Math.max(5, leaseSec / 3) * 1000);

    try {
      const proc = Bun.spawn(ctx.args.rest, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
      return await proc.exited;
    } finally {
      clearInterval(beat);
      // Released in `finally` so a crash, a signal or a non-zero exit all give
      // the capacity back. A claim leaked here would idle the account until the
      // reaper noticed.
      ctx.overton.release(res.claim.id);
    }
  },
};

export const askCommands: Record<string, Command> = { ask, explain, claim, renew, release, run };
