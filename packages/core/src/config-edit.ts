/**
 * Editing config.yaml without destroying it.
 *
 * The file is hand-written and full of comments explaining why a share is what
 * it is. Round-tripping it through `parse` → object → `stringify` would throw
 * all of that away the first time someone moved a slider, so every edit here is
 * SURGICAL: the document keeps its own formatting, comments and key order, and
 * only the addressed node changes.
 *
 * Every write validates the result against the schema BEFORE touching disk. A
 * UI that can produce an unparseable config is a UI that can take the arbiter
 * down, and the arbiter refusing to answer is the one failure mode that makes
 * everything downstream fail open.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { parseDocument, type Document } from "yaml";
import { ConfigError, parseConfig, type Config } from "./config.ts";

export interface ConfigDoc {
  doc: Document;
  file: string;
}

export function loadConfigDoc(file: string): ConfigDoc {
  return { doc: parseDocument(readFileSync(file, "utf8")), file };
}

/**
 * Validate, then write.
 *
 * @returns the parsed config that was written, so a caller can echo the
 *          resulting allocation back without re-reading the file.
 * @throws  ConfigError with the schema's own message when the edit produced
 *          something invalid. Disk is untouched in that case.
 */
export function saveConfigDoc(cd: ConfigDoc): Config {
  const text = cd.doc.toString();
  let cfg: Config;
  try {
    cfg = parseConfig(parseDocument(text).toJS(), cd.file);
  } catch (e) {
    throw e instanceof ConfigError ? e : new ConfigError((e as Error).message, cd.file);
  }
  // 0600 preserved on rewrite: the file names credential locations.
  writeFileSync(cd.file, text, { mode: 0o600 });
  return cfg;
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------

/**
 * Set one project's weight on one account.
 *
 * Weights are normalised at read time, so this is the only number a person
 * needs to touch to reallocate: raising one project's weight lowers everyone
 * else's share without any other edit.
 */
export function setShare(cd: ConfigDoc, projectId: string, accountId: string, weight: number): void {
  requireProject(cd, projectId);
  const path = ["projects", projectId, "accounts", accountId];
  if (!cd.doc.hasIn(path)) {
    // A project that did not name this account gains it, which is how the UI
    // grants access rather than requiring a separate "allow" step.
    cd.doc.setIn([...path, "weekly_share"], weight);
    return;
  }
  cd.doc.setIn([...path, "weekly_share"], weight);
}

/** Remove a project's access to an account entirely — different from a 0 weight. */
export function revokeAccount(cd: ConfigDoc, projectId: string, accountId: string): void {
  requireProject(cd, projectId);
  cd.doc.deleteIn(["projects", projectId, "accounts", accountId]);
}

export interface NewProject {
  id: string;
  roots: string[];
  /** accountId → weight. */
  accounts: Record<string, number>;
}

export function addProject(cd: ConfigDoc, p: NewProject): void {
  if (cd.doc.hasIn(["projects", p.id])) {
    throw new ConfigError(`project \`${p.id}\` already exists`, cd.file);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(p.id)) {
    throw new ConfigError(
      `\`${p.id}\` is not a usable project name — use letters, digits, dot, dash or underscore`,
      cd.file,
    );
  }
  cd.doc.setIn(["projects", p.id, "roots"], p.roots);
  for (const [accountId, weight] of Object.entries(p.accounts)) {
    cd.doc.setIn(["projects", p.id, "accounts", accountId, "weekly_share"], weight);
  }
}

export function removeProject(cd: ConfigDoc, projectId: string): void {
  requireProject(cd, projectId);
  cd.doc.deleteIn(["projects", projectId]);
}

export function setProjectRoots(cd: ConfigDoc, projectId: string, roots: string[]): void {
  requireProject(cd, projectId);
  cd.doc.setIn(["projects", projectId, "roots"], roots);
}

export function setProjectEnabled(cd: ConfigDoc, projectId: string, enabled: boolean): void {
  requireProject(cd, projectId);
  cd.doc.setIn(["projects", projectId, "enabled"], enabled);
}

/** The account-level dials: targets, the reserve, and concurrency. */
export const ACCOUNT_FIELDS = [
  "weekly_target_pct",
  "five_hour_target_pct",
  "interactive_reserve_pct",
  "max_concurrent",
  "meter_interval_sec",
] as const;

export type AccountField = (typeof ACCOUNT_FIELDS)[number];

export function setAccountField(cd: ConfigDoc, accountId: string, field: AccountField, value: number): void {
  if (!cd.doc.hasIn(["accounts", accountId])) {
    throw new ConfigError(`no account \`${accountId}\``, cd.file);
  }
  if (!ACCOUNT_FIELDS.includes(field)) {
    throw new ConfigError(`\`${field}\` is not an editable account field`, cd.file);
  }
  cd.doc.setIn(["accounts", accountId, field], value);
}

function requireProject(cd: ConfigDoc, projectId: string): void {
  if (!cd.doc.hasIn(["projects", projectId])) {
    throw new ConfigError(`no project \`${projectId}\``, cd.file);
  }
}
