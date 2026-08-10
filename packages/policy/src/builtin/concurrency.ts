/**
 * Simultaneous capacity, in two ceilings.
 *
 * The account ceiling is about the vendor and your machine: a large number of
 * sustained concurrent streams on one subscription is not reliable, whatever
 * the budget says.
 *
 * The project ceiling is about fairness within a refill. The 5-hour window
 * refills several times a day, so pacing it would block useful work to protect
 * a budget about to be handed back — but without a cap, one project drains each
 * refill the moment it lands and the others never see it.
 *
 * This policy applies to unmetered accounts too. Your laptop has a finite
 * number of cores whatever the tokens cost.
 */

import { wait, type Ruling } from "@overton/core";
import type { Facts, Policy } from "../types.ts";

export class ConcurrencyPolicy implements Policy {
  readonly id = "concurrency";
  readonly description = "Caps simultaneous claims, per account and per project";

  evaluate(f: Facts): Ruling | null {
    if (f.account.max_concurrent > 0 && f.claims.account >= f.account.max_concurrent) {
      return wait(
        `${f.accountId} is at its concurrency ceiling (${f.claims.account}/${f.account.max_concurrent})`,
        {
          detail: ["counted across every project on this account"],
          remedies: [
            "wait for a claim to close",
            "overton claims --account " + f.accountId + " — see what is holding them",
            `raise accounts.${f.accountId}.max_concurrent if the host can take it`,
          ],
          // No reset instant governs this; a claim ends when it ends. Suggest a
          // short poll rather than inventing a duration.
          retryAfterSec: 30,
        },
      );
    }

    const five = f.windows.find((w) => w.window === "five_hour");
    if (five?.mode === "burst") {
      const cap = burstCapFor(f);
      if (cap != null && f.claims.project >= cap) {
        return wait(
          `${f.projectId} already holds ${f.claims.project}/${cap} of its concurrency share on ${f.accountId}`,
          {
            detail: [
              "the 5h share governs simultaneous capacity so one project cannot monopolise a refill",
              `share × account max_concurrent ${f.account.max_concurrent} → ${cap}`,
            ],
            remedies: ["wait for one of this project's claims to close"],
            retryAfterSec: 30,
          },
        );
      }
    }
    return null;
  }
}

/**
 * The project's slice of simultaneous capacity, floored at 1.
 *
 * Floored because a share small enough to round to zero should still let the
 * project make progress eventually; the weekly gate is what actually limits it.
 */
export function burstCapFor(f: Facts): number | null {
  if (f.account.max_concurrent <= 0) return null;
  return Math.max(1, Math.ceil(f.shares.fiveHour * f.account.max_concurrent));
}
