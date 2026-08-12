#!/usr/bin/env bun
/**
 * `overton` — the CLI.
 *
 * Every other surface is a projection of this one. It needs no daemon: the
 * database is the arbiter, so `overton ask` works identically whether or not
 * `overton serve` is running.
 */

import { ConfigError, EXIT_CODE, Paths, loadConfig, openDb } from "@overton/core";
import { Overton } from "@overton/engine";
import { COMMANDS, type CommandContext } from "./commands/index.ts";

const USAGE = `overton — a quota arbiter for coding agents

  The Overton window: the range of dispatches currently acceptable.

USAGE
  overton <command> [options]

DECIDING
  ask <project> [account]     may this project spend here right now?
  claim <project> <account>   ask, and hold capacity if the answer is go
  renew <claim-id>            heartbeat an open claim
  release <claim-id>          close a claim
  run <project> <account> -- <cmd>...
                              ask, hold a claim, run the command, release

LOOKING
  status                      accounts, windows, claims, at a glance
  windows [account]           what each account's meter says
  projects                    each project's share, allocation and pace
  project ls | ensure | rm    list, create/update, or remove a project
  ledger <account>            how a window was actually spent, by project
  explain <project> <account> every fact behind a decision
  claims [--account A]        what is holding capacity
  plugins                     registered providers, cost sources, policies

RUNNING
  meter [account]             poll providers, attribute the delta, once
  daemon                      meter on a loop, and serve HTTP
  serve                       HTTP only
  mcp                         MCP server on stdio
  doctor                      check config and credentials
  init                        write a starter config

INTEGRATING
  paperclip install           build the bundled Paperclip adapter and register it
  paperclip status            is the adapter registered?

OPTIONS
  --json                      machine-readable output
  --config <path>             config file (default ~/.overton/config.yaml)
  --home <path>               state directory (default ~/.overton)

EXIT CODES
  ask and claim exit 0 go · 10 wait · 11 ask · 12 deny, so a shell can branch
  on the verdict without parsing prose.
`;

export interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
  /** Everything after a bare `--`, for `overton run`. */
  rest: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  const rest: string[] = [];
  let afterDoubleDash = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (afterDoubleDash) {
      rest.push(a);
      continue;
    }
    if (a === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const name = a.slice(2);
        const next = argv[i + 1];
        // A flag followed by a non-flag consumes it as a value, except for the
        // known booleans — `--json meter` should not swallow `meter`.
        if (next && !next.startsWith("-") && !BOOLEAN_FLAGS.has(name)) {
          flags[name] = next;
          i++;
        } else {
          flags[name] = true;
        }
      }
      continue;
    }
    positional.push(a);
  }

  return { command: positional.shift() ?? "", positional, flags, rest };
}

const BOOLEAN_FLAGS = new Set(["json", "help", "version", "force", "watch", "all", "once", "verbose"]);

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);

  if (!args.command || args.flags.help || args.command === "help") {
    process.stdout.write(USAGE);
    return 0;
  }

  const command = COMMANDS[args.command];
  if (!command) {
    process.stderr.write(`unknown command \`${args.command}\`\n\nRun \`overton help\`.\n`);
    return 2;
  }

  const paths = new Paths(
    typeof args.flags.home === "string" ? args.flags.home : Paths.fromEnv().home,
  );

  // `init` runs before there is a config to load, by definition.
  if (command.needsConfig === false) {
    return command.run({ args, paths } as CommandContext);
  }

  let overton: Overton;
  try {
    const configFile = typeof args.flags.config === "string" ? args.flags.config : paths.configFile;
    const cfg = loadConfig(configFile);
    overton = new Overton({ db: openDb(paths.dbFile), cfg, configFile });
  } catch (e) {
    if (e instanceof ConfigError) {
      process.stderr.write(`${e.message}\n`);
      return 2;
    }
    throw e;
  }

  return command.run({ args, paths, overton });
}

const code = await main(process.argv.slice(2)).catch((e: Error) => {
  process.stderr.write(`overton: ${e.message}\n`);
  return 1;
});
process.exit(code);

export { EXIT_CODE };
