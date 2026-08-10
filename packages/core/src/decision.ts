/**
 * The answer. Everything else in Overton exists to produce this value.
 *
 * A boolean would have been easier and is wrong. "No" has at least three
 * meanings that call for different behaviour from the thing that asked:
 *
 *   wait — time fixes this. Sleep `retryAfterSec` and ask again.
 *   ask  — a human fixes this. Escalate; do not retry on a timer.
 *   deny — policy fixes this. Never retry; this pairing is not allowed at all.
 *
 * An orchestrator that cannot tell them apart either hammers a gate that will
 * refuse it for four days, or gives up on a window that reopens in ten minutes.
 */

import { humanDuration } from "./time.ts";

export type Verdict = "go" | "wait" | "ask" | "deny";

/**
 * Worse is higher. This ordering is the tightening rule made mechanical: when
 * several policies rule on one request, the WORST verdict wins regardless of
 * the order they ran in, so no policy can open a gate another closed.
 *
 * `deny` outranks `ask` because a human approving something policy forbids is
 * a different (and deliberate) act — a `--force`, not an answer to a prompt.
 */
export const VERDICT_SEVERITY: Readonly<Record<Verdict, number>> = {
  go: 0,
  wait: 1,
  ask: 2,
  deny: 3,
};

export function worseVerdict(a: Verdict, b: Verdict): Verdict {
  return VERDICT_SEVERITY[a] >= VERDICT_SEVERITY[b] ? a : b;
}

/** A single policy's ruling. `null` from a policy means "no opinion". */
export interface Ruling {
  verdict: Verdict;
  /** One line, past tense, naming the subject. Rendered as the headline. */
  summary: string;
  /** Supporting facts, one per line. Numbers belong here, not in `summary`. */
  detail?: string[];
  /** Concrete next actions. A refusal without these is a dead end. */
  remedies?: string[];
  /**
   * Seconds until this ruling could plausibly change. Only meaningful for
   * `wait`. Never derived from an expired window — a reset instant in the past
   * yields a zero-length backoff that looks deliberate and hammers the gate.
   */
  retryAfterSec?: number | null;
}

export interface PolicyRuling extends Ruling {
  /** Which policy said so. Always populated by the chain. */
  policy: string;
}

/**
 * A finished decision. Unlike a `Ruling`, every field is concrete: a policy may
 * omit `detail` because it has nothing to add, but a decision handed to a caller
 * always has an array to iterate and an explicit `null` where a retry is not
 * meaningful. Optionality is a convenience for authors, not a shape consumers
 * should have to defend against.
 */
export interface Decision extends Ruling {
  detail: string[];
  remedies: string[];
  retryAfterSec: number | null;
  /** The policy whose ruling became the verdict. */
  policy: string;
  /** Every ruling, including the ones that lost, worst first. */
  rulings: PolicyRuling[];
  /** Echo of what was asked, so a stored decision is self-describing. */
  request: { project: string; account: string; at: number };
}

export function ruling(verdict: Verdict, summary: string, extra: Omit<Ruling, "verdict" | "summary"> = {}): Ruling {
  return { verdict, summary, detail: extra.detail ?? [], remedies: extra.remedies ?? [], retryAfterSec: extra.retryAfterSec ?? null };
}

export const go = (summary: string, extra?: Omit<Ruling, "verdict" | "summary">) => ruling("go", summary, extra);
export const wait = (summary: string, extra?: Omit<Ruling, "verdict" | "summary">) => ruling("wait", summary, extra);
export const ask = (summary: string, extra?: Omit<Ruling, "verdict" | "summary">) => ruling("ask", summary, extra);
export const deny = (summary: string, extra?: Omit<Ruling, "verdict" | "summary">) => ruling("deny", summary, extra);

export function isGo(d: Pick<Decision, "verdict">): boolean {
  return d.verdict === "go";
}

/**
 * Exit codes, so `overton ask` composes in a shell script without parsing prose.
 * Distinct per verdict on purpose: `until overton ask …; do sleep 60; done` is
 * correct for `wait` and an infinite loop for `deny`.
 */
export const EXIT_CODE: Readonly<Record<Verdict, number>> = {
  go: 0,
  wait: 10,
  ask: 11,
  deny: 12,
};

/** `go` / `wait 4h12m` / `deny` — the one-word form for a status column. */
export function verdictLabel(d: Pick<Decision, "verdict" | "retryAfterSec">): string {
  if (d.verdict === "wait" && d.retryAfterSec != null) return `wait ${humanDuration(d.retryAfterSec)}`;
  return d.verdict;
}

/** Human rendering, shared by the CLI and the HTTP surface's text mode. */
export function renderDecision(d: Decision): string {
  const lines = [`${verdictLabel(d)} · ${d.summary}`];
  for (const line of d.detail ?? []) lines.push(`  ${line}`);
  if (d.remedies?.length) {
    lines.push("");
    for (const r of d.remedies) lines.push(`  → ${r}`);
  }
  return lines.join("\n");
}
