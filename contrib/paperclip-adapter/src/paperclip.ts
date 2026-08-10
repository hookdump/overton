/**
 * Everything Paperclip hands an agent, assembled the way the built-in adapters
 * assemble it.
 *
 * The first version of this adapter treated "run the CLI" as the whole job. It
 * was not. A Paperclip agent needs three things this file provides, and without
 * any one of them it wakes up, finds nothing, and reports that it has nothing
 * to do:
 *
 *   the PROMPT   — the task lives in `context.paperclipTaskMarkdown`, not in a
 *                  `taskTitle`/`taskBody` pair. Reading the wrong keys produced
 *                  a heartbeat whose entire prompt was "(woken because: …)".
 *   the ENV      — `buildPaperclipEnv` supplies the API url, the instance, the
 *                  workspace; `authToken` supplies the key. Without them the
 *                  agent cannot call back into Paperclip at all.
 *   the TOOLS    — Paperclip runs MCP servers per run and expects the agent to
 *                  be pointed at them. Without that the agent has no way to
 *                  record a disposition, so every issue stalls on
 *                  "missing issue disposition" no matter how well the run went.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
import {
  DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE,
  asString,
  buildPaperclipEnv,
  isPaperclipRecoveryWakePayload,
  joinPromptSections,
  readPaperclipIssueWorkModeFromContext,
  renderPaperclipWakePrompt,
  renderTemplate,
  stringifyPaperclipWakePayload,
} from "@paperclipai/adapter-utils/server-utils";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/**
 * The environment a Paperclip agent runs in.
 *
 * Mirrors the built-in adapters: the base block, then the run, then whatever
 * the wake was about. `PAPERCLIP_API_KEY` comes from the context's `authToken`
 * and is the credential the agent uses to call back — it is never read from
 * agent config, so a config field cannot be used to smuggle a different one.
 */
export function paperclipEnv(ctx: AdapterExecutionContext): Record<string, string> {
  const { agent, runId, context } = ctx;
  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  env.PAPERCLIP_RUN_ID = runId;

  const taskId = str(context.taskId) ?? str(context.issueId);
  if (taskId) env.PAPERCLIP_TASK_ID = taskId;

  const workMode = readPaperclipIssueWorkModeFromContext(context);
  if (workMode) env.PAPERCLIP_ISSUE_WORK_MODE = workMode;

  const wakeReason = str(context.wakeReason);
  if (wakeReason) env.PAPERCLIP_WAKE_REASON = wakeReason;

  const commentId = str(context.wakeCommentId) ?? str(context.commentId);
  if (commentId) env.PAPERCLIP_WAKE_COMMENT_ID = commentId;

  const approvalId = str(context.approvalId);
  if (approvalId) env.PAPERCLIP_APPROVAL_ID = approvalId;

  const approvalStatus = str(context.approvalStatus);
  if (approvalStatus) env.PAPERCLIP_APPROVAL_STATUS = approvalStatus;

  const linked = Array.isArray(context.issueIds)
    ? context.issueIds.filter((v): v is string => typeof v === "string" && v.trim() !== "")
    : [];
  if (linked.length) env.PAPERCLIP_LINKED_ISSUE_IDS = linked.join(",");

  const wakePayload = stringifyPaperclipWakePayload(context.paperclipWake);
  if (wakePayload) env.PAPERCLIP_WAKE_PAYLOAD_JSON = wakePayload;

  if (ctx.authToken) env.PAPERCLIP_API_KEY = ctx.authToken;

  return env;
}

export interface BuiltPrompt {
  prompt: string;
  metrics: Record<string, number>;
}

/**
 * The prompt, in the order the built-ins compose it.
 *
 * A resumed session gets only the delta — the wake note — because the task is
 * already in the session's own history and re-sending it every heartbeat both
 * wastes tokens and invites the agent to redo work it has already done. A
 * recovery wake likewise carries its own instruction and must not be buried
 * under the standing heartbeat template.
 */
export function buildPrompt(ctx: AdapterExecutionContext, sessionId: string | null): BuiltPrompt {
  const { agent, runId, context, config } = ctx;
  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "heartbeat" },
    context,
  };

  const template = asString(config.promptTemplate, DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE);
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, {
    resumedSession: Boolean(sessionId),
  });
  const useDelta = Boolean(sessionId) && wakePrompt.length > 0;
  const rendered =
    useDelta || isPaperclipRecoveryWakePayload(context.paperclipWake)
      ? ""
      : renderTemplate(template, templateData);

  const handoff = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const task = asString(context.paperclipTaskMarkdown, "").trim();

  const prompt = joinPromptSections([wakePrompt, handoff, task, rendered]);
  return {
    prompt,
    metrics: {
      promptChars: prompt.length,
      wakePromptChars: wakePrompt.length,
      sessionHandoffChars: handoff.length,
      taskContextChars: task.length,
      heartbeatPromptChars: rendered.length,
    },
  };
}

export interface RuntimeMcp {
  configPath: string | null;
  count: number;
  /** Identity of the server set, so a session is not resumed against a different one. */
  identity: string;
}

/**
 * Write the per-run MCP config that gives the agent its Paperclip tools.
 *
 * Same shape the built-in writes: an HTTP server per connection, bearer token
 * in the header. Written under the run's own directory at 0600 — the token is a
 * live credential for this company.
 */
export async function writeMcpConfig(ctx: AdapterExecutionContext, stateDir: string): Promise<RuntimeMcp> {
  const servers = ctx.runtimeMcp?.getServers() ?? [];
  const identity = JSON.stringify(servers.map(({ name, url, connectionId }) => ({ name, url, connectionId })));
  if (servers.length === 0) return { configPath: null, count: 0, identity };

  const configPath = join(stateDir, "runs", ctx.runId, "mcp", "mcp-config.json");
  const used = new Set<string>();
  const mcpServers: Record<string, unknown> = {};
  for (const server of servers) {
    // Names collide across connections; disambiguate rather than silently
    // dropping one, which would remove tools the agent was told it has.
    let name = server.name;
    if (used.has(name)) name = `${name}-${server.connectionId.slice(0, 8)}`;
    let suffix = 2;
    while (used.has(name)) {
      name = `${server.name}-${server.connectionId.slice(0, 8)}-${suffix}`;
      suffix += 1;
    }
    used.add(name);
    mcpServers[name] = {
      type: "http",
      url: server.url,
      headers: { Authorization: `Bearer ${server.token}` },
    };
  }

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({ mcpServers }), { mode: 0o600 });
  return { configPath, count: servers.length, identity };
}

/** Where per-run runtime state goes. Namespaced by company and agent. */
export function runtimeStateDir(env: NodeJS.ProcessEnv, companyId: string, agentId: string): string {
  const home = env.PAPERCLIP_HOME ?? join(env.HOME ?? "/tmp", ".paperclip");
  return join(home, "runtime", "overton", companyId, agentId);
}

/**
 * The working directory the run should use.
 *
 * Paperclip resolves a workspace per run and puts it in the environment; that
 * wins over anything configured, because the workspace is where Paperclip
 * expects artifacts and git state to land. Falling back to a configured `cwd`
 * covers agents that manage their own directory.
 */
export function resolveCwd(env: Record<string, string>, configuredCwd: string | null): string | null {
  return str(env.PAPERCLIP_WORKSPACE_CWD) ?? configuredCwd;
}
