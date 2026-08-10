/**
 * The running commands: metering, the daemon, the servers, and setup.
 */

import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { statSync } from "node:fs";
import { humanDuration, loadConfig, table } from "@overton/core";
import { Overton } from "@overton/engine";
import { runMcpStdio, serve } from "@overton/server";
import type { Command } from "./index.ts";
import { STARTER_CONFIG } from "../starter.ts";

/** 0 when the file is missing — a deleted config is a change worth noticing. */
function mtimeOf(file: string): number {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return 0;
  }
}

const meter: Command = {
  async run(ctx) {
    const [only] = ctx.args.positional;
    const results = only ? [await ctx.overton.meterAccount(only)] : await ctx.overton.meter();
    const housekeeping = ctx.overton.tick();

    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify({ results, housekeeping }, null, 2) + "\n");
      return results.some((r) => r.error) ? 1 : 0;
    }

    const rows = results.map((r) => [
      r.accountId,
      r.error ? "ERROR" : r.reading ? "ok" : "no reading",
      r.reading
        ? Object.entries(r.reading.windows)
            .map(([k, w]) => `${k.replace("seven_day", "7d").replace("five_hour", "5h")} ${w!.utilizationPct.toFixed(0)}%`)
            .join("  ")
        : "",
      Object.entries(r.attributed)
        .map(([k, v]) => `${k} +${v.toFixed(2)}`)
        .join(" ") || "—",
      String(r.costEvents),
      r.rolled.length ? `rolled ${r.rolled.join(",")}` : "",
      r.error ?? "",
    ]);
    process.stdout.write(
      table(["ACCOUNT", "STATE", "WINDOWS", "ATTRIBUTED", "EVENTS", "EPOCH", "ERROR"], rows) + "\n",
    );

    // Surfaced rather than swallowed: a provider reporting non-monotonically is
    // a real bug, and smoothing it over hides the thing worth fixing.
    for (const r of results) {
      for (const u of r.uncorroborated) {
        process.stderr.write(
          `warning: ${r.accountId} ${u.kind} dropped ${u.from.toFixed(1)}% → ${u.to.toFixed(1)}% ` +
            `with no corroborating reset — treated as the same window\n`,
        );
      }
    }
    if (housekeeping.reaped) {
      process.stderr.write(`reaped ${housekeeping.reaped} claim(s) whose heartbeat stopped\n`);
    }
    return results.some((r) => r.error) ? 1 : 0;
  },
};

/**
 * The daemon: meter on a loop, and serve.
 *
 * Deliberately not a scheduler of work. It owns no queue and dispatches
 * nothing; it keeps readings fresh and answers questions. If it dies, `overton
 * ask` keeps working against the same database — the readings simply age, and
 * the freshness guard tightens accordingly rather than silently going stale.
 */
const daemon: Command = {
  async run(ctx) {
    // Mutable, because the config file is reloaded in place. Everything below
    // reads through `current()` rather than capturing the instance.
    let o = ctx.overton;
    // Checked on every read rather than once per tick. A `stat` costs
    // microseconds and the alternative is a config edit that appears to do
    // nothing for up to three minutes — long enough to conclude, wrongly, that
    // the edit was itself wrong.
    const current = () => {
      reloadIfChanged();
      return o;
    };

    const configFile =
      typeof ctx.args.flags.config === "string" ? ctx.args.flags.config : ctx.paths.configFile;
    let configMtime = mtimeOf(configFile);

    /**
     * Reload when the file changes.
     *
     * Without this the daemon answers from the config it started with, while
     * `overton ask` reads the file every invocation — so the CLI and the HTTP
     * surface disagree, and both look confident. Adding a project and watching
     * the daemon keep refusing it is exactly that failure.
     *
     * A broken edit is kept OUT: the running config survives, because a daemon
     * that stops arbitrating on a syntax error fails open for anything that
     * treats an error as "no opinion".
     */
    const reloadIfChanged = () => {
      const mtime = mtimeOf(configFile);
      if (mtime === configMtime) return;
      configMtime = mtime;
      try {
        const cfg = loadConfig(configFile);
        o = new Overton({ db: o.db, cfg, configFile });
        process.stderr.write(
          `config reloaded: ${Object.keys(cfg.accounts).length} accounts, ${Object.keys(cfg.projects).length} projects\n`,
        );
      } catch (e) {
        process.stderr.write(`config reload FAILED, keeping the previous one: ${(e as Error).message}\n`);
      }
    };

    const intervals = Object.values(o.cfg.accounts)
      .filter((a) => a.enabled)
      .map((a) => a.meter_interval_sec);
    const tickSec = intervals.length ? Math.min(...intervals) : 180;

    const server = ctx.args.flags["no-http"]
      ? null
      : serve(current, {
          onRequest: (m, p, s) => {
            if (ctx.args.flags.verbose) process.stderr.write(`${m} ${p} ${s}\n`);
          },
        });
    if (server) {
      process.stderr.write(`overton http://${server.hostname}:${server.port}\n`);
      process.stderr.write(`  expose it with: tailscale serve --bg --set-path /overton http://127.0.0.1:${server.port}\n`);
    }
    process.stderr.write(`metering every ${humanDuration(tickSec)}\n`);

    let running = true;
    const stop = () => {
      running = false;
      server?.stop();
      process.stderr.write("\noverton: stopped\n");
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);

    while (running) {
      try {
        const results = await current().meter();
        current().tick();
        for (const r of results) {
          if (r.error) process.stderr.write(`meter ${r.accountId}: ${r.error}\n`);
        }
      } catch (e) {
        // A failed tick must never take the daemon down: the HTTP surface
        // staying up with ageing readings is strictly better than nothing
        // answering at all, and the freshness guard already handles age.
        process.stderr.write(`tick failed: ${(e as Error).message}\n`);
      }
      await Bun.sleep(tickSec * 1000);
    }
    return 0;
  },
};

const serveCmd: Command = {
  async run(ctx) {
    const server = serve(ctx.overton, {
      onRequest: (m, p, s) => {
        if (ctx.args.flags.verbose) process.stderr.write(`${m} ${p} ${s}\n`);
      },
    });
    process.stderr.write(`overton http://${server.hostname}:${server.port}\n`);
    await new Promise(() => {}); // serve until signalled
    return 0;
  },
};

const mcp: Command = {
  async run(ctx) {
    await runMcpStdio(ctx.overton);
    return 0;
  },
};

const doctor: Command = {
  async run(ctx) {
    const results = await ctx.overton.doctor();
    if (ctx.args.flags.json) {
      process.stdout.write(JSON.stringify(results, null, 2) + "\n");
      return results.some((r) => r.problems.length) ? 1 : 0;
    }
    let bad = 0;
    for (const r of results) {
      if (r.problems.length === 0) {
        process.stdout.write(`ok    ${r.accountId}\n`);
        continue;
      }
      bad++;
      process.stdout.write(`FAIL  ${r.accountId}\n`);
      for (const p of r.problems) {
        process.stdout.write(p.split("\n").map((l) => `        ${l}`).join("\n") + "\n");
      }
    }
    if (!results.length) process.stdout.write("no enabled accounts in config\n");
    return bad ? 1 : 0;
  },
};

const init: Command = {
  needsConfig: false,
  run(ctx) {
    const file = typeof ctx.args.flags.config === "string" ? ctx.args.flags.config : ctx.paths.configFile;
    if (existsSync(file) && !ctx.args.flags.force) {
      process.stderr.write(`${file} already exists — pass --force to overwrite\n`);
      return 1;
    }
    mkdirSync(dirname(file), { recursive: true });
    // 0600: the file names credential locations and, for a headless host, the
    // env var holding a long-lived token.
    writeFileSync(file, STARTER_CONFIG, { mode: 0o600 });
    process.stdout.write(`wrote ${file}\n\nNext:\n  $EDITOR ${file}\n  overton doctor\n  overton meter\n  overton status\n`);
    return 0;
  },
};

export const opsCommands: Record<string, Command> = {
  meter,
  daemon,
  serve: serveCmd,
  mcp,
  doctor,
  init,
};
