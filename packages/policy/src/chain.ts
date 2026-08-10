/**
 * Running the chain.
 *
 * Every policy rules on every request, and the WORST verdict wins. Not
 * first-match: worst.
 *
 * That choice is the tightening rule made structural. With first-match, the
 * correctness of a gate depends on the order of a list in a config file, and
 * someone reordering it to "put the cheap checks first" can silently let a
 * budget policy be pre-empted by a permissive one. With worst-wins, no ordering
 * of any set of policies can produce a more permissive answer than the strictest
 * policy in it. Order decides only which of two EQUALLY severe rulings is
 * reported as the headline.
 */

import {
  newId,
  worseVerdict,
  type Decision,
  type PolicyRuling,
  type Ruling,
  VERDICT_SEVERITY,
} from "@overton/core";
import type { Facts, Policy } from "./types.ts";

export interface ChainResult extends Decision {}

export function runChain(policies: readonly Policy[], facts: Facts): ChainResult {
  const rulings: PolicyRuling[] = [];

  for (const policy of policies) {
    let r: Ruling | null;
    try {
      r = policy.evaluate(facts);
    } catch (e) {
      // A policy that throws must not open the gate. It is a bug, and the
      // failure mode of a budget guard has to be "refuse and say so".
      r = {
        verdict: "ask",
        summary: `policy \`${policy.id}\` failed: ${(e as Error).message}`,
        detail: ["a policy that cannot decide is treated as a refusal, never as consent"],
        remedies: ["fix or remove the policy", "overton ask --explain for the facts it was given"],
        retryAfterSec: null,
      };
    }
    if (r) rulings.push({ ...r, policy: policy.id });
  }

  rulings.sort((a, b) => VERDICT_SEVERITY[b.verdict] - VERDICT_SEVERITY[a.verdict]);

  const worst = rulings.reduce<Ruling["verdict"]>((acc, r) => worseVerdict(acc, r.verdict), "go");
  const winner = rulings.find((r) => r.verdict === worst);

  const base: Omit<Decision, "verdict" | "summary" | "policy"> = {
    detail: [],
    remedies: [],
    retryAfterSec: null,
    rulings,
    request: { project: facts.projectId, account: facts.accountId, at: facts.now },
  };

  if (!winner || worst === "go") {
    return {
      ...base,
      verdict: "go",
      policy: winner?.policy ?? "chain",
      summary: `${facts.projectId} may dispatch on ${facts.accountId}`,
      detail: goDetail(facts),
    };
  }

  return {
    ...base,
    verdict: winner.verdict,
    policy: winner.policy,
    summary: winner.summary,
    detail: winner.detail ?? [],
    remedies: winner.remedies ?? [],
    // The SHORTEST retry among equally-severe rulings: waking earlier than
    // strictly necessary costs one refused request, while waking later than
    // necessary silently idles the fleet.
    retryAfterSec: shortestRetry(rulings, worst),
  };
}

function shortestRetry(rulings: PolicyRuling[], verdict: Ruling["verdict"]): number | null {
  const values = rulings
    .filter((r) => r.verdict === verdict && r.retryAfterSec != null)
    .map((r) => r.retryAfterSec!);
  return values.length ? Math.min(...values) : null;
}

/** An allow should still show its work — the numbers that made it an allow. */
function goDetail(facts: Facts): string[] {
  if (!facts.metered) return ["unmetered account — no window to spend"];
  return facts.windows.map((w) => {
    const used = w.used + w.staleAdjustment;
    const label = w.window === "weekly" ? "7d" : "5h";
    return (
      `${label}  used ${used.toFixed(1)} of ${w.allowance.toFixed(1)} pts allowed ` +
      `(alloc ${w.alloc.toFixed(1)}, ${(w.elapsed * 100).toFixed(0)}% elapsed)`
    );
  });
}

/** Persist a decision. A gate nobody can audit after the fact is not trusted. */
export function recordDecision(
  db: import("@overton/core").DB,
  decision: Decision,
): string {
  const id = newId("dec");
  db.query(
    `INSERT INTO decisions (id, ts, project_id, account_id, verdict, policy, summary, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    decision.request.at,
    decision.request.project,
    decision.request.account,
    decision.verdict,
    decision.policy,
    decision.summary,
    JSON.stringify(decision),
  );
  return id;
}
