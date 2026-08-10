import type { Paths } from "@overton/core";
import type { Overton } from "@overton/engine";
import type { ParsedArgs } from "../index.ts";
import { askCommands } from "./ask.ts";
import { lookCommands } from "./look.ts";
import { opsCommands } from "./ops.ts";
import { projectCommand } from "./project.ts";

export interface CommandContext {
  args: ParsedArgs;
  paths: Paths;
  /** Absent only for commands declaring `needsConfig: false`. */
  overton: Overton;
}

export interface Command {
  run(ctx: CommandContext): number | Promise<number>;
  /** Set false for commands that must work before a config exists. */
  needsConfig?: boolean;
}

export const COMMANDS: Record<string, Command> = {
  ...askCommands,
  ...lookCommands,
  ...opsCommands,
  project: projectCommand,
};
