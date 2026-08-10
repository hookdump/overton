/**
 * Configuration: the only place a human states policy.
 *
 * Three rules shaped this schema.
 *
 * 1. ACCOUNTS ARE SYMMETRIC ROWS. There is no "current" or "default" account.
 *    Every account is an enabled row and every selection is explicit, which
 *    deletes the entire class of "which account was that charged to?" bugs.
 *
 * 2. A SHARE IS OF THE DISPATCHABLE POOL, NOT OF THE PLAN. `weekly_share: 0.3`
 *    means 30% of what is left for agents after your own interactive reserve —
 *    the difference between a gate that protects your terminal work and one
 *    that eats it.
 *
 * 3. UNKNOWN KEYS SURVIVE. Provider plugins read their own fields off the
 *    account block, so the schema passes through what it does not recognise
 *    rather than rejecting a config written for a plugin it has not loaded.
 */

import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { FIVE_HOURS, HOUR, WEEK } from "./time.ts";
import { INTERACTIVE, type ProjectId } from "./types.ts";

const pct = z.number().min(0).max(100);
const fraction = z.number().min(0).max(1);

/**
 * `burst` does not pace the 5-hour window — that window exists to be burned and
 * refills several times a day, so pacing it blocks useful work to protect a
 * budget about to be handed back. What the share governs there is how much of
 * the account's *simultaneous* capacity one project may hold.
 */
export const FiveHourModeSchema = z.enum(["pace", "burst", "off"]);
export type FiveHourMode = z.infer<typeof FiveHourModeSchema>;

export const AccountSchema = z
  .object({
    /** Provider plugin id. `anthropic`, `codex`, `unmetered`, or your own. */
    provider: z.string().min(1),
    enabled: z.boolean().default(true),
    plan: z.string().optional(),

    /**
     * The account-level stop. A project being under its own share does not
     * entitle it to the last points of the plan; that headroom is what lets you
     * notice a limit before a run does.
     */
    weekly_target_pct: pct.default(85),
    five_hour_target_pct: pct.default(90),
    /** Points held back from agents entirely, for your own interactive work. */
    interactive_reserve_pct: pct.default(10),

    /** Ceiling on simultaneous claims across all projects on this account. */
    max_concurrent: z.number().int().min(0).default(6),

    /** How often the daemon polls this account's provider. */
    meter_interval_sec: z.number().int().min(10).default(180),

    // Well-known provider fields, declared so a typo is caught here rather than
    // silently ignored by the plugin that expected them.
    config_dir: z.string().optional(),
    codex_home: z.string().optional(),
    oauth_token_env: z.string().optional(),
  })
  .passthrough();

export type AccountConfig = z.infer<typeof AccountSchema>;

export const ProjectAccountSchema = z
  .object({
    /**
     * This project's slice of the account's dispatchable weekly pool.
     *
     * Shares are NORMALISED across projects, so they are weights rather than
     * percentages: three projects at 1.0 each get a third apiece. A share of 0
     * is a positive statement — this project may never use this account.
     */
    weekly_share: z.number().min(0).default(1),
    five_hour: z
      .object({
        mode: FiveHourModeSchema.default("burst"),
        share: z.number().min(0).optional(),
      })
      .default({ mode: "burst" }),
  })
  .passthrough();

export type ProjectAccountConfig = z.infer<typeof ProjectAccountSchema>;

export const ProjectSchema = z
  .object({
    enabled: z.boolean().default(true),
    /**
     * Filesystem roots that identify this project's work. A transcript whose
     * `cwd` is under one of these is charged here. Overlapping roots resolve
     * longest-prefix-first, so a monorepo subdirectory can be its own project.
     */
    roots: z.array(z.string()).default([]),
    accounts: z.record(z.string(), ProjectAccountSchema).default({}),
  })
  .passthrough();

export type ProjectConfig = z.infer<typeof ProjectSchema>;

export const PolicySchema = z
  .object({
    /**
     * The chain, by plugin id, in the order they run. Order does not affect the
     * verdict — the worst ruling wins regardless — but it decides which of two
     * equally severe rulings is reported as the headline.
     */
    chain: z
      .array(z.string())
      .default(["account-stop", "reading-guard", "allocation", "concurrency"]),

    weekly: z
      .object({
        /**
         * The allowance collapses at a window boundary: the instant the window
         * resets, elapsed is 0 and a project could spend nothing — stalling the
         * fleet precisely when a fresh week opens with everything to spend.
         * The floor carries it until the elapsed term takes over.
         */
        floor_pct: fraction.default(0.15),
        /** Tolerance above the paced line, so a single run cannot trip a gate. */
        slack_pct: fraction.default(0.05),
      })
      .default({}),

    freshness: z
      .object({
        stale_sec: z.number().int().min(1).default(150),
        week_stale_sec: z.number().int().min(1).default(6 * HOUR),
      })
      .default({}),

    /** A claim not renewed within this is presumed dead and reaped. */
    claim_lease_sec: z.number().int().min(10).default(300),
  })
  .default({});

export type PolicyConfig = z.infer<typeof PolicySchema>;

export const ServerSchema = z
  .object({
    /** Loopback only by default. Expose it with `tailscale serve`, not 0.0.0.0. */
    host: z.string().default("127.0.0.1"),
    port: z.number().int().min(1).max(65535).default(7787),
  })
  .default({});

export const ConfigSchema = z
  .object({
    accounts: z.record(z.string(), AccountSchema).default({}),
    projects: z.record(z.string(), ProjectSchema).default({}),
    policy: PolicySchema,
    server: ServerSchema,
  })
  .strict();

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {
  constructor(message: string, readonly file?: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function parseConfig(raw: unknown, file?: string): Config {
  const parsed = ConfigSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new ConfigError(`invalid config:\n${lines.join("\n")}`, file);
  }
  return validate(parsed.data, file);
}

export function loadConfig(file: string): Config {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    throw new ConfigError(
      `no config at ${file}\n  fix: copy examples/config.yaml there and edit it, then \`chmod 600\` it`,
      file,
    );
  }
  return parseConfig(parseYaml(text), file);
}

/**
 * Cross-field checks zod cannot express, all of which are the difference
 * between a confusing refusal later and a clear error now.
 */
function validate(cfg: Config, file?: string): Config {
  const problems: string[] = [];

  for (const [id, a] of Object.entries(cfg.accounts)) {
    if (a.interactive_reserve_pct >= a.weekly_target_pct) {
      problems.push(
        `accounts.${id}: interactive_reserve_pct (${a.interactive_reserve_pct}) leaves nothing ` +
          `dispatchable below weekly_target_pct (${a.weekly_target_pct}) — every request would be refused`,
      );
    }
  }

  for (const [pid, p] of Object.entries(cfg.projects)) {
    if (pid === INTERACTIVE) {
      problems.push(`projects.${pid}: \`${INTERACTIVE}\` is reserved for unattributed spend`);
    }
    for (const aid of Object.keys(p.accounts)) {
      if (!cfg.accounts[aid]) {
        problems.push(`projects.${pid}.accounts.${aid}: no such account`);
      }
    }
  }

  if (problems.length) throw new ConfigError(`invalid config:\n  ${problems.join("\n  ")}`, file);
  return cfg;
}

// ---------------------------------------------------------------------------
// Derived values — one definition, so every surface agrees
// ---------------------------------------------------------------------------

/** Percentage points of the weekly window that agents may use in total. */
export function dispatchablePool(a: AccountConfig): number {
  return Math.max(0, a.weekly_target_pct - a.interactive_reserve_pct);
}

/** Same, for the 5-hour window. The reserve is your headroom in both. */
export function fiveHourPool(a: AccountConfig): number {
  return Math.max(0, a.five_hour_target_pct - a.interactive_reserve_pct);
}

export function fiveHourShare(pa: ProjectAccountConfig): number {
  return pa.five_hour.share ?? pa.weekly_share;
}

/**
 * A project's share of one account, normalised across every enabled project
 * that names it.
 *
 * Normalising is what makes shares behave like weights: you reroute capacity by
 * changing one number, and the other projects absorb the difference without you
 * having to keep a column summing to 1.0 by hand.
 */
export function normalisedShare(
  cfg: Config,
  projectId: ProjectId,
  accountId: string,
  window: "weekly" | "five_hour",
): number {
  const own = cfg.projects[projectId]?.accounts[accountId];
  if (!own) return 0;
  const pick = (pa: ProjectAccountConfig) => (window === "weekly" ? pa.weekly_share : fiveHourShare(pa));

  let total = 0;
  for (const [pid, p] of Object.entries(cfg.projects)) {
    if (!p.enabled) continue;
    const pa = p.accounts[accountId];
    if (!pa) continue;
    // A project that opted this window out is not competing for it, so it must
    // not dilute the projects that are.
    if (window === "five_hour" && pa.five_hour.mode === "off") continue;
    void pid;
    total += pick(pa);
  }
  if (total <= 0) return 0;
  return pick(own) / total;
}

export function windowSecFor(window: "weekly" | "five_hour"): number {
  return window === "weekly" ? WEEK : FIVE_HOURS;
}
