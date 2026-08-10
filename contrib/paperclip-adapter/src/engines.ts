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
    const args = ["--print", "--output-format", "stream-json", "--verbose"];
    if (o.model) args.push("--model", o.model);
    if (o.sessionId) args.push("--resume", o.sessionId);
    if (o.skipPermissions) args.push("--dangerously-skip-permissions");
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
