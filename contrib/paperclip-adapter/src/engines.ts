/**
 * The engines this adapter can run once the gate says go.
 *
 * Each engine is a small description: how to build a headless invocation, and
 * how to read usage back out of its output. Adding one is a new entry here plus
 * an option in the config schema — no new package, no new adapter type.
 *
 * Keeping them in one table rather than one adapter each is deliberate. The
 * interesting behaviour in this adapter is the gate, and it is identical for
 * every engine; three near-identical packages would drift.
 */

export type EngineId = "claude" | "codex" | "ollama";

/**
 * Split a configured command into leading `VAR=value` assignments and the
 * binary itself.
 *
 * Paperclip's built-in local adapters accept a shell-flavoured command such as
 * `CLAUDE_CONFIG_DIR=/Users/me/.claude-profiles/personal claude`, and existing
 * agents are configured that way. This adapter spawns WITHOUT a shell — passing
 * that string straight to exec looks for a binary literally named
 * `CLAUDE_CONFIG_DIR=…` and fails with ENOENT — so the prefix is parsed here
 * instead of being handed to `/bin/sh`.
 *
 * Not using a shell is deliberate: the command may carry a path from config,
 * and a shell would make quoting bugs into arbitrary execution.
 */
export function parseCommand(raw: string): { command: string; env: Record<string, string> } {
  const env: Record<string, string> = {};
  // Split on whitespace, honouring simple quoting around values so a profile
  // path containing a space survives.
  const tokens = raw.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  let i = 0;
  for (; i < tokens.length; i++) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(tokens[i]!);
    if (!m) break;
    env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  const rest = tokens.slice(i);
  return { command: (rest[0] ?? raw).replace(/^["']|["']$/g, ""), env };
}

export interface EngineInvocation {
  command: string;
  args: string[];
  /** Extra env layered over the process environment. */
  env: Record<string, string>;
  /** Prompt is written to stdin rather than argv when true — avoids arg limits. */
  promptOnStdin: boolean;
}

export interface EngineUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  model?: string;
  costUsd?: number;
  sessionId?: string;
  summary?: string;
}

export interface EngineSpec {
  id: EngineId;
  label: string;
  /** Default binary; overridable per agent via `command`. */
  defaultCommand: string;
  /** Which Overton provider an account for this engine normally uses. */
  provider: string;
  build(opts: BuildOptions): EngineInvocation;
  /** Pull usage out of whatever the engine printed. Must never throw. */
  parseUsage(stdout: string): EngineUsage;
}

export interface BuildOptions {
  command: string;
  prompt: string;
  model?: string;
  /** Resume a previous session when the engine supports it. */
  sessionId?: string;
  cwd?: string;
  extraArgs: string[];
  env: Record<string, string>;
  /** Claude profile directory, so a work/personal seat is selectable. */
  configDir?: string;
  /** Codex home, same idea. */
  codexHome?: string;
  skipPermissions: boolean;
  /**
   * Paperclip's per-run MCP config. This is how the agent gets the tools it
   * needs to record a disposition; without it a run can succeed and the issue
   * still stalls.
   */
  mcpConfigPath?: string | null;
  /** The agent's standing instructions (AGENTS.md), for a fresh session only. */
  instructionsFile?: string | null;
  maxTurns?: number;
  effort?: string;
}

function lastJsonObject(stdout: string, predicate: (o: any) => boolean): any | null {
  // Engines stream JSONL; the summary record is usually last but not always.
  // Scanned in reverse so the newest matching record wins.
  const lines = stdout.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim();
    if (!line.startsWith("{")) continue;
    try {
      const o = JSON.parse(line);
      if (predicate(o)) return o;
    } catch {
      continue;
    }
  }
  return null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// ---------------------------------------------------------------------------

const claude: EngineSpec = {
  id: "claude",
  label: "Claude Code",
  defaultCommand: "claude",
  provider: "anthropic",
  build(o) {
    // `-` is the prompt argument: read it from stdin. Without it the CLI waits
    // on a positional prompt that never arrives.
    const args = ["--print", "-", "--output-format", "stream-json", "--verbose"];
    if (o.sessionId) args.push("--resume", o.sessionId);
    if (o.skipPermissions) args.push("--dangerously-skip-permissions");
    if (o.model) args.push("--model", o.model);
    if (o.effort) args.push("--effort", o.effort);
    if (o.maxTurns && o.maxTurns > 0) args.push("--max-turns", String(o.maxTurns));
    // On a resumed session the instructions are already in the session cache;
    // re-injecting them costs thousands of tokens per heartbeat.
    if (o.instructionsFile && !o.sessionId) args.push("--append-system-prompt-file", o.instructionsFile);
    // `--strict-mcp-config` keeps the agent to Paperclip's servers rather than
    // also loading whatever the user has configured globally.
    if (o.mcpConfigPath) args.push("--mcp-config", o.mcpConfigPath, "--strict-mcp-config");
    args.push(...o.extraArgs);
    const env = { ...o.env };
    // The profile directory is how a personal and a work seat coexist. It must
    // match the account Overton just gated on, or the budget was charged
    // against a subscription other than the one actually spent.
    if (o.configDir) env.CLAUDE_CONFIG_DIR = o.configDir;
    return { command: o.command, args, env, promptOnStdin: true };
  },
  parseUsage(stdout) {
    const result = lastJsonObject(stdout, (o) => o?.type === "result");
    if (!result) return { inputTokens: 0, outputTokens: 0 };
    const u = result.usage ?? {};
    return {
      inputTokens: num(u.input_tokens),
      outputTokens: num(u.output_tokens),
      cachedInputTokens: num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens),
      model: typeof result.model === "string" ? result.model : undefined,
      // `total_cost_usd` is 0 on a subscription, which is correct and is
      // exactly why Overton exists: the cost is not the constraint.
      costUsd: typeof result.total_cost_usd === "number" ? result.total_cost_usd : undefined,
      sessionId: typeof result.session_id === "string" ? result.session_id : undefined,
      summary: typeof result.result === "string" ? result.result.slice(0, 500) : undefined,
    };
  },
};

const codex: EngineSpec = {
  id: "codex",
  label: "Codex CLI",
  defaultCommand: "codex",
  provider: "codex",
  build(o) {
    const args = ["exec", "--json"];
    if (o.model) args.push("--model", o.model);
    if (o.skipPermissions) args.push("--dangerously-bypass-approvals-and-sandbox");
    if (o.cwd) args.push("--cd", o.cwd);
    args.push(...o.extraArgs);
    const env = { ...o.env };
    if (o.codexHome) env.CODEX_HOME = o.codexHome;
    // Codex configures MCP through its own config.toml rather than a flag, so
    // Paperclip's per-run servers are NOT wired here. A Codex agent can do the
    // work but cannot record its own disposition; `warnings` says so out loud
    // rather than leaving it to be discovered from a stalled issue.
    // Codex `exec` reads the prompt from stdin when none is given positionally.
    return { command: o.command, args, env, promptOnStdin: true };
  },
  parseUsage(stdout) {
    // Codex reports cumulative totals per turn; the last one is the run total.
    const tc = lastJsonObject(
      stdout,
      (o) => o?.msg?.type === "token_count" || o?.type === "token_count" || o?.payload?.type === "token_count",
    );
    const info = tc?.msg?.info ?? tc?.info ?? tc?.payload?.info ?? {};
    const total = info.total_token_usage ?? {};
    return {
      inputTokens: num(total.input_tokens),
      outputTokens: num(total.output_tokens),
      cachedInputTokens: num(total.cached_input_tokens),
      sessionId: typeof tc?.session_id === "string" ? tc.session_id : undefined,
    };
  },
};

const ollama: EngineSpec = {
  id: "ollama",
  label: "Ollama (local)",
  defaultCommand: "ollama",
  provider: "unmetered",
  build(o) {
    // `run <model>` with the prompt on stdin is the one invocation that behaves
    // the same across ollama versions.
    const args = ["run", o.model || "llama3.2"];
    args.push(...o.extraArgs);
    return { command: o.command, args, env: { ...o.env }, promptOnStdin: true };
  },
  parseUsage(stdout) {
    // Ollama prints prose, not JSON. Tokens are unknown and reporting a
    // fabricated zero would be a lie of a different kind — but it is also
    // unmetered, so nothing downstream depends on the number.
    return { inputTokens: 0, outputTokens: 0, summary: stdout.trim().slice(0, 500) };
  },
};

export const ENGINES: Record<EngineId, EngineSpec> = { claude, codex, ollama };

export function engineFor(id: string | undefined): EngineSpec {
  const e = ENGINES[(id ?? "claude") as EngineId];
  if (!e) throw new Error(`unknown engine \`${id}\` — expected one of ${Object.keys(ENGINES).join(", ")}`);
  return e;
}
