/**
 * Environment diagnostics.
 *
 * Fail fast, with a fix. The failure this exists to prevent is an agent that
 * looks configured, sits in the org chart, and only discovers at 03:00 that its
 * account name was a typo.
 *
 * `error` is reserved for setups that genuinely cannot run. Everything else is
 * `warn`, because warnings are not save blockers and a config the user cannot
 * save is worse than one that runs with a caveat.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import { OvertonClient } from "../overton.js";
import { engineFor, parseCommand } from "../engines.js";
import { ADAPTER_TYPE, DEFAULT_OVERTON_URL } from "../constants.js";

const execFileAsync = promisify(execFile);

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config ?? {};
  const checks: AdapterEnvironmentCheck[] = [];
  const baseUrl = str(config.overtonUrl) ?? DEFAULT_OVERTON_URL;
  const accountId = str(config.account);
  const overton = new OvertonClient(baseUrl);

  // --- Overton itself ------------------------------------------------------
  let reachable = false;
  try {
    const health = await overton.health();
    reachable = true;
    checks.push({
      code: "overton_reachable",
      level: "info",
      message: `Overton is up at ${baseUrl}`,
      detail: `${health.accounts} accounts, ${health.projects} projects, policy chain: ${health.policies.join(" → ")}`,
    });
  } catch (e) {
    checks.push({
      code: "overton_unreachable",
      level: "error",
      message: `Overton is not reachable at ${baseUrl}`,
      detail: (e as Error).message,
      hint: "Start it with `overton daemon`, or set `overtonUrl` if it runs elsewhere.",
    });
  }

  // --- the account ---------------------------------------------------------
  if (!accountId) {
    checks.push({
      code: "account_missing",
      level: "error",
      message: "No Overton account configured",
      hint: "Set `account` to one of the accounts in ~/.overton/config.yaml (see `overton status`).",
    });
  } else if (reachable) {
    try {
      const accounts = await overton.accounts();
      const found = accounts.find((a) => a.accountId === accountId);
      if (!found) {
        checks.push({
          code: "account_unknown",
          level: "error",
          message: `Overton has no account named \`${accountId}\``,
          detail: `Known accounts: ${accounts.map((a) => a.accountId).join(", ") || "(none)"}`,
          hint: "Add it to ~/.overton/config.yaml, or fix the name here.",
        });
      } else {
        const seven = found.windows.find((w) => w.kind === "seven_day");
        checks.push({
          code: "account_ok",
          level: "info",
          message: `Account \`${accountId}\` (${found.provider}${found.plan ? `, ${found.plan}` : ""})`,
          detail: seven
            ? `7d window at ${seven.utilizationPct.toFixed(0)}%, ${seven.resetsIn ? `resets in ${seven.resetsIn}` : "reset unknown"}; ${found.claims}/${found.maxConcurrent} claims`
            : found.metered
              ? "no window reading yet — run `overton meter`"
              : "unmetered account",
        });
        if (found.metered && found.readingAgeSec == null) {
          checks.push({
            code: "no_reading",
            level: "warn",
            message: "This account has never been metered",
            hint: "Run `overton meter` (or `overton daemon`) so the gate has real numbers to work from.",
          });
        }
      }
    } catch (e) {
      checks.push({
        code: "account_check_failed",
        level: "warn",
        message: "Could not list Overton accounts",
        detail: (e as Error).message,
      });
    }
  }

  // --- the engine binary ---------------------------------------------------
  let engineId = "claude";
  /** Env assignments found on the command, if it was written in shell style. */
  let envPrefix: Record<string, string> = {};
  try {
    const engine = engineFor(str(config.engine));
    engineId = engine.id;
    // The configured command may carry `VAR=value` prefixes; strip them so the
    // binary itself is what gets probed. This is the same parse `execute` does,
    // so a pass here means the same thing a run would find.
    const parsed = parseCommand(str(config.command) ?? engine.defaultCommand);
    envPrefix = parsed.env;
    try {
      const { stdout } = await execFileAsync(parsed.command, ["--version"], {
        timeout: 8000,
        env: { ...process.env, ...parsed.env },
      });
      checks.push({
        code: "engine_ok",
        level: "info",
        message: `${engine.label}: ${stdout.trim().split("\n")[0] ?? "found"}`,
        detail: Object.keys(parsed.env).length
          ? `via ${parsed.command}, with ${Object.keys(parsed.env).join(", ")} from the command`
          : undefined,
      });
    } catch {
      checks.push({
        code: "engine_missing",
        level: "error",
        message: `\`${parsed.command}\` is not runnable on this host`,
        hint: `Install ${engine.label}, or set the Command field to its full path.`,
      });
    }
  } catch (e) {
    checks.push({
      code: "engine_unknown",
      level: "error",
      message: (e as Error).message,
      hint: "Set `engine` to claude, codex or ollama.",
    });
  }

  // --- consistency ---------------------------------------------------------
  // The classic silent misconfiguration: gate on the personal seat, spend on
  // the work one. The budget is then charged against a subscription other than
  // the one actually used, and every number downstream is wrong.
  // The seat may be pinned either by the explicit field or by an env prefix on
  // the command. Either is fine; NEITHER is the failure worth warning about.
  const claudeSeat = str(config.configDir) ?? envPrefix.CLAUDE_CONFIG_DIR;
  const codexSeat = str(config.codexHome) ?? envPrefix.CODEX_HOME;

  if (engineId === "claude") {
    if (claudeSeat) {
      checks.push({
        code: "seat_pinned",
        level: "info",
        message: `Claude profile pinned to ${claudeSeat}`,
        detail: str(config.configDir) ? "from the profile field" : "from the command's env prefix",
      });
    } else {
      checks.push({
        code: "no_config_dir",
        level: "warn",
        message: "Claude will use whichever profile is default",
        hint: "Set `Claude profile directory` to the profile matching the Overton account, e.g. ~/.claude-profiles/personal, so the seat you gate on is the seat you spend from.",
      });
    }
  }
  if (engineId === "codex" && !codexSeat) {
    checks.push({
      code: "no_codex_home",
      level: "warn",
      message: "Codex will use its default profile",
      hint: "Set `Codex home` to the CODEX_HOME matching the Overton account.",
    });
  }

  const status = checks.some((c) => c.level === "error")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "pass";

  return { adapterType: ADAPTER_TYPE, status, checks, testedAt: new Date().toISOString() };
}
