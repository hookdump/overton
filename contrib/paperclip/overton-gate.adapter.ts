/**
 * `overton_gated` — a Paperclip adapter that wraps another adapter.
 *
 * Paperclip enforces budgets in CURRENCY: each agent gets a monthly figure and
 * pauses at 100%. That is the right model for API keys. It is the wrong model
 * for subscriptions, where the binding constraint is a rolling plan window that
 * several projects share and no amount of dollars will unblock.
 *
 * This adapter adds the missing half. On every heartbeat it asks Overton
 * whether this project may spend on this account right now; if the answer is
 * no, the heartbeat becomes a no-op with a readable reason, and the underlying
 * agent never starts. If yes, it opens a claim, delegates to whatever adapter
 * you were already using, and releases the claim afterwards.
 *
 * It wraps rather than replaces, so it works with `claude_local`, `codex_local`,
 * `process`, `http` — anything in the registry, including external plugins.
 *
 * ---------------------------------------------------------------------------
 * STATUS: written against Paperclip's PUBLISHED adapter documentation
 * (docs/adapters/overview.md and the Custom Adapters guide), not compiled
 * against a checkout. The shape of ServerAdapterModule, AdapterExecutionContext
 * and AdapterExecutionResult is taken from those docs and may have drifted.
 * Verify the three type imports and the registry path below against your
 * installed version before relying on it.
 * ---------------------------------------------------------------------------
 *
 * Install:
 *   1. cp overton-gate.adapter.ts <paperclip>/server/src/adapters/overton-gate.ts
 *   2. register it (see contrib/paperclip/README.md)
 *   3. set an agent's adapterType to `overton_gated`
 */

import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
  AdapterExecutionContext,
  AdapterExecutionResult,
  ServerAdapterModule,
} from "../types.js";
import { ADAPTER_REGISTRY } from "./registry.js";

/** Config block on an agent using this adapter. */
interface OvertonGateConfig {
  /** Overton project id. Defaults to the agent's slug if omitted. */
  project?: string;
  /** Overton account id — which subscription this agent spends from. */
  account: string;
  /** The adapter to run once the gate says go. */
  inner: { type: string; config?: Record<string, unknown> };
  /** Overton's HTTP surface. */
  baseUrl?: string;
  /**
   * Run anyway when Overton refuses, recording the override.
   *
   * Deliberately per-agent rather than global: "this one agent may overrun the
   * budget" is a decision someone should make for a named agent, not a flag
   * that quietly applies to the whole company.
   */
  force?: boolean;
}

interface Decision {
  verdict: "go" | "wait" | "ask" | "deny";
  summary: string;
  detail: string[];
  remedies: string[];
  retryAfterSec: number | null;
  policy: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:7787";
const TIMEOUT_MS = 5000;

/**
 * Exit code for "no work done, try again later".
 *
 * 75 is EX_TEMPFAIL from sysexits.h — the conventional "transient, retry"
 * signal. It matters that this is not 0: a heartbeat that reports success
 * without running the agent looks, in every dashboard, exactly like a heartbeat
 * where the agent found nothing to do.
 */
const EX_TEMPFAIL = 75;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`overton ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export const overtonGatedAdapter: ServerAdapterModule = {
  type: "overton_gated",

  agentConfigurationDoc: `# Overton-gated agent

Asks [Overton](https://github.com/hookdump/overton) for permission before each
heartbeat, then runs the inner adapter.

\`\`\`json
{
  "account": "claude-personal",
  "project": "myproject",
  "inner": { "type": "claude_local", "config": { "model": "opus" } }
}
\`\`\`

| field | | |
|---|---|---|
| \`account\` | required | Overton account id — which subscription to spend from |
| \`project\` | optional | Overton project id; defaults to the agent slug |
| \`inner\`   | required | the adapter to run when the gate says go |
| \`baseUrl\` | optional | default \`http://127.0.0.1:7787\` |
| \`force\`   | optional | run even when refused, and record the override |

When Overton refuses, the heartbeat exits ${EX_TEMPFAIL} without starting the
agent, and the reason is written to the run log. No tokens are spent.`,

  async execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
    const config = (ctx.config ?? {}) as unknown as OvertonGateConfig;
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const project = config.project ?? (ctx.agent as any)?.slug ?? (ctx.agent as any)?.id;
    const account = config.account;

    if (!account || !config.inner?.type) {
      return {
        exitCode: 1,
        errorCode: "overton_misconfigured",
        errorMessage: "overton_gated needs `account` and `inner.type` in adapterConfig",
      };
    }

    // --- ask ---------------------------------------------------------------
    let decision: Decision;
    try {
      decision = await call<Decision>(
        `${baseUrl}/v1/ask?project=${encodeURIComponent(project)}&account=${encodeURIComponent(account)}`,
      );
    } catch (e) {
      // FAIL CLOSED. An unreachable arbiter is missing information, and the
      // whole point of this adapter is that missing information must not
      // authorise spend. A heartbeat skipped costs one cycle; a heartbeat run
      // blind costs budget that is not ours to spend.
      ctx.onLog?.(`overton: unreachable (${(e as Error).message}) — skipping this heartbeat`);
      return {
        exitCode: EX_TEMPFAIL,
        errorCode: "overton_unreachable",
        errorMessage: `Overton unreachable at ${baseUrl}: ${(e as Error).message}`,
      };
    }

    if (decision.verdict !== "go" && !config.force) {
      const lines = [
        `overton: ${decision.verdict} — ${decision.summary}`,
        ...decision.detail.map((d) => `  ${d}`),
        ...decision.remedies.map((r) => `  → ${r}`),
      ];
      if (decision.retryAfterSec != null) {
        lines.push(`  retry in ${Math.ceil(decision.retryAfterSec / 60)} min`);
      }
      ctx.onLog?.(lines.join("\n"));
      ctx.onMeta?.({ overton: decision });

      return {
        exitCode: EX_TEMPFAIL,
        // Distinct per verdict so a Paperclip-side rule can tell "wait for the
        // window" apart from "this pairing is never allowed" — the latter is a
        // configuration mistake that will never resolve on its own.
        errorCode: `overton_${decision.verdict}`,
        errorMessage: decision.summary,
      };
    }

    // --- claim -------------------------------------------------------------
    // Capacity is reserved HERE, not after the agent boots: the gap between
    // asking and starting is long enough for every other agent to pass the
    // same check.
    let claimId: string | null = null;
    try {
      const res = await call<{ claim: { id: string } | null }>(`${baseUrl}/v1/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project,
          account,
          label: `paperclip:${(ctx.agent as any)?.name ?? project}`,
          force: config.force === true,
        }),
      });
      claimId = res.claim?.id ?? null;
    } catch (e) {
      ctx.onLog?.(`overton: could not open a claim (${(e as Error).message}) — skipping`);
      return {
        exitCode: EX_TEMPFAIL,
        errorCode: "overton_claim_failed",
        errorMessage: (e as Error).message,
      };
    }

    if (config.force && decision.verdict !== "go") {
      ctx.onLog?.(`overton: FORCED past ${decision.verdict} — ${decision.summary}`);
    }

    // --- delegate ----------------------------------------------------------
    const inner = (ADAPTER_REGISTRY as Record<string, ServerAdapterModule>)[config.inner.type];
    if (!inner) {
      if (claimId) await release(baseUrl, claimId, ctx);
      return {
        exitCode: 1,
        errorCode: "overton_unknown_inner",
        errorMessage: `no adapter registered for inner type \`${config.inner.type}\``,
      };
    }

    // Heartbeat me while the inner adapter runs, or the reaper will take the
    // claim out from under a long run and free capacity that is still in use.
    const beat = claimId
      ? setInterval(() => {
          void fetch(`${baseUrl}/v1/claim/${claimId}/renew`, { method: "POST" }).catch(() => {});
        }, 60_000)
      : null;

    try {
      return await inner.execute({ ...ctx, config: config.inner.config ?? {} } as AdapterExecutionContext);
    } finally {
      if (beat) clearInterval(beat);
      // Released in `finally` so a throw, a timeout or a cancellation all give
      // the capacity back. A leaked claim idles the account until it is reaped.
      if (claimId) await release(baseUrl, claimId, ctx);
    }
  },

  async testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
    const config = (ctx.config ?? {}) as unknown as OvertonGateConfig;
    const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    try {
      const health = await call<{ ok: boolean; accounts: number }>(`${baseUrl}/v1/health`);
      const inner = (ADAPTER_REGISTRY as Record<string, ServerAdapterModule>)[config.inner?.type ?? ""];
      if (!inner) {
        return { ok: false, message: `inner adapter \`${config.inner?.type}\` is not registered` };
      }
      // Test the inner adapter too: a gate in front of a broken agent is a
      // green check on something that cannot run.
      const innerResult = await inner.testEnvironment({
        ...ctx,
        config: config.inner?.config ?? {},
      } as AdapterEnvironmentTestContext);
      if (!innerResult.ok) return innerResult;

      return { ok: true, message: `Overton ok at ${baseUrl} (${health.accounts} accounts) → ${config.inner.type}` };
    } catch (e) {
      return {
        ok: false,
        message: `Overton unreachable at ${baseUrl}: ${(e as Error).message}. Start it with \`overton daemon\`.`,
      };
    }
  },
};

async function release(baseUrl: string, claimId: string, ctx: AdapterExecutionContext): Promise<void> {
  try {
    await fetch(`${baseUrl}/v1/claim/${claimId}/release`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    // Not fatal: the claim's heartbeat has stopped, so Overton reaps it within
    // `claim_lease_sec`. Worth a log line, never worth failing a completed run.
    ctx.onLog?.(`overton: release failed (${(e as Error).message}); it will be reaped`);
  }
}

export default overtonGatedAdapter;
