/**
 * The account-wide stop, which is independent of any project's share.
 *
 * A project being under its own allocation does not entitle it to the last
 * points of the plan. That headroom is what lets you notice a limit before a
 * run does — and it is the only thing standing between an over-eager fleet and
 * your own terminal session at 11pm.
 */

import { canDeriveRetryAfter, humanDuration, wait, type Ruling } from "@overton/core";
import type { Facts, Policy } from "../types.ts";

export class AccountStopPolicy implements Policy {
  readonly id = "account-stop";
  readonly description = "Stops every project once the account itself reaches its target";

  evaluate(f: Facts): Ruling | null {
    if (!f.metered || f.accountPct == null) return null;
    if (f.accountPct < f.account.weekly_target_pct) return null;

    const weekly = f.windows.find((w) => w.window === "weekly");
    const resetsAt = weekly?.reading?.resetsAt ?? null;
    // Never derive a backoff from a window that has already ended: the instant
    // is in the past, so the wait is zero and the caller becomes a hot loop.
    const usable = weekly ? canDeriveRetryAfter(weekly.freshness) : false;
    const retryAfterSec = usable && resetsAt != null ? Math.max(0, resetsAt - f.now) : null;

    return wait(
      `${f.accountId} is at ${f.accountPct.toFixed(0)}% of its weekly window (target ${f.account.weekly_target_pct}%)`,
      {
        detail: [
          "the target is a stop for the whole account, not a per-project one",
          resetsAt != null ? `window resets in ${humanDuration(resetsAt - f.now)}` : "reset time unknown",
        ],
        remedies: alternatives(f),
        retryAfterSec,
      },
    );
  }
}

/** A refusal without a way out is a dead end. Always name one. */
export function alternatives(f: Facts): string[] {
  const out: string[] = [];
  for (const alt of f.alternatives) {
    if (alt.accountId === f.accountId) continue;
    if (alt.alloc - alt.used > 0) {
      out.push(
        `try --account ${alt.accountId} (${alt.used.toFixed(1)} of ${alt.alloc.toFixed(1)} pts used)`,
      );
    }
  }
  out.push("run it anyway with --force — logged, and counted against the next window");
  return out;
}
