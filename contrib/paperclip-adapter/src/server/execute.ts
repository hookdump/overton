/**
 * The heartbeat: ask Overton, then run the engine.
 *
 * The ordering is the whole product.
 *
 *   1. ask    — may this project spend on this account right now?
 *   2. claim  — reserve capacity BEFORE doing anything slow. The gap between
 *               asking and spawning is long enough for every other agent to
 *               pass the same check, and they all will.
 *   3. run    — spawn the engine, streaming output back to Paperclip.
 *   4. release — in a `finally`, so a crash, a timeout or a cancellation all
 *               give the capacity back rather than idling the account until
 *               Overton's reaper notices.
 */

import { spawn } from "node:child_process";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { redactEnvForLogs } from "@paperclipai/adapter-utils/server-utils";
import { OvertonClient, OvertonError, type Decision } from "../overton.js";
import { engineFor, parseCommand } from "../engines.js";
import { ADAPTER_TYPE } from "../constants.js";
import { buildPrompt, paperclipEnv, resolveCwd, runtimeStateDir, writeMcpConfig } from "../paperclip.js";

/**
 * Exit code for "no work done, try again later" (EX_TEMPFAIL).
 *
 * It matters that this is not 0. A heartbeat reporting success without running
 * the agent looks, in every dashboard, exactly like a heartbeat where the agent
 * ran and found nothing to do.
 */
const EX_TEMPFAIL = 75;
/** EX_CONFIG — the pairing is not allowed and no amount of waiting changes it. */
const EX_CONFIG = 78;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}
function bool(v: unknown, dflt = false): boolean {
  return typeof v === "boolean" ? v : dflt;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function refusal(decision: Decision, ctx: AdapterExecutionContext): AdapterExecutionResult {
  const lines = [
    `overton: ${decision.verdict} — ${decision.summary}`,
    ...decision.detail.map((d) => `  ${d}`),
    ...decision.remedies.map((r) => `  → ${r}`),
  ];
  if (decision.retryAfterSec != null) {
    lines.push(`  retry in ~${Math.max(1, Math.ceil(decision.retryAfterSec / 60))} min`);
  }
  void ctx.onLog("stdout", lines.join("\n") + "\n");

  return {
    exitCode: decision.verdict === "deny" ? EX_CONFIG : EX_TEMPFAIL,
    signal: null,
    timedOut: false,
    errorMessage: decision.summary,
    // Distinct per verdict so a rule on the Paperclip side can tell "the window
    // will reopen" apart from "this is a configuration mistake".
    errorCode: `overton_${decision.verdict}`,
    // `provider_quota` is the family Paperclip already understands for
    // "upstream says no more", which is exactly what a budget refusal is.
    errorFamily: decision.verdict === "deny" ? null : "provider_quota",
    retryNotBefore:
      decision.retryAfterSec != null
        ? new Date(Date.now() + decision.retryAfterSec * 1000).toISOString()
        : null,
    usage: { inputTokens: 0, outputTokens: 0 },
    summary: decision.summary,
  };
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config ?? {};
  const overton = new OvertonClient(str(config.overtonUrl) ?? "http://127.0.0.1:7787");

  const account = str(config.account);
  // Default the project to the company, which is the mapping most setups want:
  // one Paperclip company per Overton project.
  const project = str(config.project) ?? str(ctx.agent.companyId) ?? ctx.agent.id;
  const force = bool(config.force);

  if (!account) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorCode: "overton_misconfigured",
      errorMessage: "adapterConfig.account is required — it names the Overton account to spend from",
    };
  }

  // --- 1. ask --------------------------------------------------------------
  let decision: Decision;
  try {
    decision = await overton.ask(project, account);
  } catch (e) {
    // FAIL CLOSED. An unreachable arbiter is missing information, and missing
    // information must not authorise spend — that is the entire premise. A
    // skipped heartbeat costs one cycle; a blind one costs budget.
    const message = e instanceof OvertonError ? e.message : (e as Error).message;
    await ctx.onLog("stderr", `overton: ${message}\n  skipping this heartbeat rather than running unmetered\n`);
    return {
      exitCode: EX_TEMPFAIL,
      signal: null,
      timedOut: false,
      errorCode: "overton_unreachable",
      errorMessage: message,
      errorFamily: "transient_upstream",
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  if (decision.verdict !== "go" && !force) return refusal(decision, ctx);
  if (decision.verdict !== "go") {
    await ctx.onLog("stdout", `overton: FORCED past ${decision.verdict} — ${decision.summary}\n`);
  }

  // --- 2. claim ------------------------------------------------------------
  let claimId: string | null = null;
  try {
    claimId = await overton.claim({
      project,
      account,
      label: `paperclip:${ctx.agent.name}`,
      force,
    });
  } catch (e) {
    await ctx.onLog("stderr", `overton: could not reserve capacity — ${(e as Error).message}\n`);
    return {
      exitCode: EX_TEMPFAIL,
      signal: null,
      timedOut: false,
      errorCode: "overton_claim_failed",
      errorMessage: (e as Error).message,
      usage: { inputTokens: 0, outputTokens: 0 },
    };
  }

  // --- 3. run --------------------------------------------------------------
  const engine = engineFor(str(config.engine));

  // Everything Paperclip expects the agent to have. Assembled before the
  // prompt, because the workspace it names decides where the run happens.
  const env = paperclipEnv(ctx);
  const sessionId = bool(config.persistSession, true)
    ? (str((ctx.runtime.sessionParams ?? {}).sessionId) ?? str(ctx.runtime.sessionId))
    : undefined;

  const { prompt, metrics } = buildPrompt(ctx, sessionId ?? null);

  let mcp = { configPath: null as string | null, count: 0, identity: "" };
  try {
    mcp = await writeMcpConfig(ctx, runtimeStateDir(process.env, ctx.agent.companyId, ctx.agent.id));
  } catch (e) {
    // Not fatal, but loud: the agent can still do the work, it just cannot
    // record the outcome, and a silently tool-less agent looks like a lazy one.
    await ctx.onLog("stderr", `overton: could not write the Paperclip MCP config — ${(e as Error).message}\n`);
  }
  if (mcp.count === 0) {
    await ctx.onLog(
      "stdout",
      "overton: Paperclip supplied no MCP servers for this run — the agent will have no tools to " +
        "update issues, so any work it does will stall on \"missing issue disposition\".\n",
    );
  }
  if (engine.id !== "claude" && mcp.count > 0) {
    await ctx.onLog(
      "stdout",
      `overton: ${engine.label} does not take Paperclip's MCP servers from a flag, so this run has ` +
        "no tools to record a disposition. Use the Claude engine for issue-driven work.\n",
    );
  }

  // The seat follows the account by default.
  //
  // The account Overton just gated on already declares where its credentials
  // live, so asking a human to retype that path only creates the chance to type
  // a different one — and gating on one subscription while spending from
  // another is silent and corrupts every number downstream. An explicit field
  // still wins, for the rare agent that needs a different profile.
  let seat: { configDir?: string; codexHome?: string } = {};
  try {
    const acct = await overton.account(account);
    if (acct) seat = { configDir: acct.configDir ?? undefined, codexHome: acct.codexHome ?? undefined };
  } catch {
    // Not fatal: an explicit field or the command's env prefix may still pin it,
    // and testEnvironment warns when nothing does.
  }

  const parsed = parseCommand(str(config.command) ?? engine.defaultCommand);
  // Paperclip's own workspace wins over a configured cwd: it is where artifacts
  // and git state are expected to land.
  const cwd = resolveCwd(env, str(config.cwd) ?? null);
  const timeoutSec = num(config.timeoutSec) ?? 0;
  const graceSec = num(config.graceSec) ?? 15;

  const invocation = engine.build({
    command: parsed.command,
    prompt,
    model: str(config.model),
    sessionId,
    cwd: cwd ?? undefined,
    extraArgs: strArray(config.extraArgs),
    env: { ...env, ...parsed.env },
    configDir: str(config.configDir) ?? parsed.env.CLAUDE_CONFIG_DIR ?? seat.configDir,
    codexHome: str(config.codexHome) ?? parsed.env.CODEX_HOME ?? seat.codexHome,
    skipPermissions: bool(config.dangerouslySkipPermissions, false),
    mcpConfigPath: engine.id === "claude" ? mcp.configPath : null,
    instructionsFile: str(config.instructionsFilePath),
    maxTurns: num(config.maxTurnsPerRun) ?? 0,
    effort: str(config.effort) ?? str(config.modelReasoningEffort) ?? undefined,
  });

  await ctx.onMeta?.({
    adapterType: ADAPTER_TYPE,
    command: invocation.command,
    commandArgs: invocation.args,
    cwd: cwd ?? undefined,
    prompt,
    promptMetrics: metrics,
    // Redacted: the env carries PAPERCLIP_API_KEY and is echoed into run logs.
    env: redactEnvForLogs({ ...env, ...invocation.env }),
    commandNotes: [
      `overton: ${decision.verdict} via ${decision.policy}`,
      `project ${project} on account ${account}`,
      claimId ? `claim ${claimId}` : "no claim",
      mcp.count > 0 ? `${mcp.count} Paperclip MCP server(s)` : "no MCP servers",
      sessionId ? `resuming session ${sessionId}` : "fresh session",
    ],
    context: { engine: engine.id, project, account },
  });

  // Renew every 60s. Overton reaps a claim whose heartbeat stops, and a long
  // run must not have its capacity freed out from under it.
  const beat = claimId ? setInterval(() => void overton.renew(claimId!), 60_000) : null;

  try {
    return await runEngine({ ctx, invocation, engine, prompt, timeoutSec, graceSec, cwd: cwd ?? undefined, mcpIdentity: mcp.identity });
  } finally {
    if (beat) clearInterval(beat);
    if (claimId) await overton.release(claimId);
  }
}

interface RunArgs {
  ctx: AdapterExecutionContext;
  /**
   * Recorded with the session so a later run does not resume a session that was
   * created against a different MCP server set — the agent would believe it has
   * tools that are no longer wired.
   */
  mcpIdentity: string;
  invocation: ReturnType<ReturnType<typeof engineFor>["build"]>;
  engine: ReturnType<typeof engineFor>;
  prompt: string;
  timeoutSec: number;
  graceSec: number;
  cwd: string | undefined;
}

function runEngine(a: RunArgs): Promise<AdapterExecutionResult> {
  const { ctx, invocation, engine, prompt, timeoutSec, graceSec, cwd } = a;

  return new Promise<AdapterExecutionResult>((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...invocation.env },
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const finish = (result: AdapterExecutionResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    child.on("error", (err) => {
      void ctx.onLog("stderr", `${err.message}\n`);
      finish({
        exitCode: 127,
        signal: null,
        timedOut: false,
        errorCode: "engine_spawn_failed",
        errorMessage: `could not start \`${invocation.command}\`: ${err.message}`,
      });
    });

    child.stdout?.on("data", (buf: Buffer) => {
      const chunk = buf.toString("utf8");
      // Bounded: a runaway engine must not exhaust the server's heap. The tail
      // is what usage parsing needs, so the head is what gets dropped.
      stdout = (stdout + chunk).slice(-2_000_000);
      void ctx.onLog("stdout", chunk);
    });
    child.stderr?.on("data", (buf: Buffer) => {
      const chunk = buf.toString("utf8");
      stderr = (stderr + chunk).slice(-100_000);
      void ctx.onLog("stderr", chunk);
    });

    let killTimer: NodeJS.Timeout | null = null;
    const timer =
      timeoutSec > 0
        ? setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            // SIGKILL after the grace period: an engine that ignores SIGTERM
            // would otherwise hold its claim until the reaper takes it.
            killTimer = setTimeout(() => child.kill("SIGKILL"), Math.max(1, graceSec) * 1000);
          }, timeoutSec * 1000)
        : null;

    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);

      let usage;
      try {
        usage = engine.parseUsage(stdout);
      } catch {
        // Parsing output from an LLM-driven process is untrusted work; a bad
        // parse must never turn a successful run into a failed one.
        usage = { inputTokens: 0, outputTokens: 0 };
      }

      finish({
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        errorMessage: code === 0 ? null : stderr.trim().slice(-2000) || null,
        usage: {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          ...(usage.cachedInputTokens ? { cachedInputTokens: usage.cachedInputTokens } : {}),
        },
        usageBasis: engine.id === "codex" ? "session_cumulative" : "per_run",
        provider: engine.provider,
        model: usage.model ?? null,
        // Subscription, not API: saying so is what stops Paperclip's dollar
        // budget from double-counting work that Overton already governs.
        billingType: engine.id === "ollama" ? "fixed" : "subscription",
        costUsd: usage.costUsd ?? null,
        sessionId: usage.sessionId ?? null,
        sessionParams: usage.sessionId
          ? { sessionId: usage.sessionId, mcpServerIdentity: a.mcpIdentity }
          : null,
        sessionDisplayId: usage.sessionId ?? null,
        summary: usage.summary ?? null,
      });
    });

    if (invocation.promptOnStdin) {
      child.stdin?.write(prompt);
      child.stdin?.end();
    }
  });
}
