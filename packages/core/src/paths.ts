/**
 * Where things live. One home, overridable by env for tests and for running
 * several isolated Overtons on one host.
 */

import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

/** Absolute, home-expanded, and resolved against `base` when relative. */
export function absolute(p: string, base = process.cwd()): string {
  const e = expandHome(p);
  return isAbsolute(e) ? e : resolve(base, e);
}

export class Paths {
  constructor(readonly home: string) {}

  static fromEnv(env: NodeJS.ProcessEnv = process.env): Paths {
    return new Paths(expandHome(env.OVERTON_HOME ?? "~/.overton"));
  }

  get configFile(): string {
    return join(this.home, "config.yaml");
  }
  get dbFile(): string {
    return join(this.home, "overton.db");
  }
  get socketFile(): string {
    return join(this.home, "overton.sock");
  }
}

/** `<config_dir>/projects` — where Claude Code writes session transcripts. */
export function claudeProjectsDir(configDir: string): string {
  return join(expandHome(configDir), "projects");
}

/** `<config_dir>/.credentials.json` — Linux, and macOS without the keychain. */
export function claudeCredentialsFile(configDir: string): string {
  return join(expandHome(configDir), ".credentials.json");
}

/** `$CODEX_HOME/sessions` — where Codex writes rollout JSONL. */
export function codexSessionsDir(codexHome: string): string {
  return join(expandHome(codexHome), "sessions");
}
