/**
 * The centrepiece: is this project ahead of its slice of this window?
 *
 * Two refusals live here and they are different in kind.
 *
 *   ALLOCATED NOTHING — `weekly_share: 0` is a positive statement that this
 *   project may never use this account. It must be a `deny`, not a `wait`:
 *   time will not change it, and `alloc = 0, used = 0, 0 > 0 === false` would
 *   otherwise read as "no budget" and behave as "one free run".
 *
 *   OVER ALLOCATION — the project has spent more than the clock permits. That
 *   is a `wait`, and the retry-after is real information: the caller can sleep
 *   exactly long enough rather than poll.
 */

import { canDeriveRetryAfter, deny, humanDuration, wait, type Ruling } from "@overton/core";
import { projectedFinish } from "../allocator.ts";
import { alternatives } from "./account-stop.ts";
import type { Facts, Policy, WindowFacts } from "../types.ts";

export class AllocationPolicy implements Policy {
  readonly id = "allocation";
  readonly description = "Paces each project against its share of the window";

  evaluate(f: Facts): Ruling | null {
    if (!f.metered) return null;

    if (!f.projectAccount) {
      return deny(`${f.projectId} is not configured to use ${f.accountId}`, {
        detail: ["a project may only spend on accounts it names in config"],
        remedies: [`add \`projects.${f.projectId}.accounts.${f.accountId}\` to config.yaml`, ...alternatives(f)],
      });
    }

    const weekly = f.windows.find((w) => w.window === "weekly");
    if (weekly && weekly.alloc <= 0) {
      return deny(`${f.projectId} is allocated nothing on ${f.accountId}`, {
        detail: ["its weekly_share resolves to 0, so there is no budget to spend"],
        remedies: [
          `give it a weekly_share in config.yaml, or route to another account`,
          ...alternatives(f),
        ],
      });
    }

    const over = f.windows.find((w) => w.used + w.staleAdjustment > w.allowance);
    if (!over) return null;

    return wait(
      `${f.projectId} is over its ${over.window === "weekly" ? "weekly" : "5-hour"} allocation on ${f.accountId}`,
      { detail: explain(f, over), remedies: alternatives(f), retryAfterSec: retryAfter(f, over) },
    );
  }
}

function explain(f: Facts, w: WindowFacts): string[] {
  const used = w.used + w.staleAdjustment;
  const projected = projectedFinish(used, w.elapsed);
  const label = w.window === "weekly" ? "7d" : "5h";

  const lines = [
    `account   ${f.accountId}  ${label} ${f.accountPct?.toFixed(0) ?? "?"}% used ` +
      `(target ${f.account.weekly_target_pct}, your reserve ${f.account.interactive_reserve_pct})`,
    `project   ${f.projectId}  alloc ${w.alloc.toFixed(1)} pts  used ${used.toFixed(1)} pts`,
    w.mode === "pace"
      ? `clock     ${(w.elapsed * 100).toFixed(0)}% of the window elapsed → allowance ${w.allowance.toFixed(1)} pts`
      : `ceiling   burst mode: a flat ceiling of ${w.allowance.toFixed(1)} pts, no pacing`,
    `reading   ${w.freshness}${f.reading ? `, ${humanDuration(f.now - f.reading.ts)} old` : ""}`,
    `over by ${(used - w.allowance).toFixed(1)} pts.` +
      (projected
        ? ` At this rate it finishes the window at ${projected.toFixed(1)} pts ` +
          `(${((projected / w.alloc) * 100).toFixed(0)}% of alloc).`
        : ""),
  ];
  if (w.staleAdjustment > 0) {
    lines.push(
      `includes ${w.staleAdjustment.toFixed(1)} pts estimated since the last reading — stale readings tighten`,
    );
  }
  return lines;
}

/**
 * When could this plausibly change?
 *
 * Under pacing the answer is not the window reset — it is the moment the clock
 * catches up with what has already been spent, which is usually much sooner.
 * Solving `elapsed(t) * alloc + slack >= used` for t gives that instant.
 */
function retryAfter(f: Facts, w: WindowFacts): number | null {
  if (!w.reading || !canDeriveRetryAfter(w.freshness)) return null;
  const resetsAt = w.reading.resetsAt;
  if (resetsAt == null) return null;
  const untilReset = Math.max(0, resetsAt - f.now);

  // A flat ceiling does not catch up. Only the reset clears it.
  if (w.mode !== "pace" || w.alloc <= 0) return untilReset;

  const used = w.used + w.staleAdjustment;
  const slack = w.alloc * f.policy.weekly.slack_pct;
  const neededElapsed = (used - slack) / w.alloc;
  if (neededElapsed >= 1) return untilReset;

  const windowStart = resetsAt - w.reading.windowSec;
  const catchUpAt = windowStart + neededElapsed * w.reading.windowSec;
  return Math.max(0, Math.min(untilReset, Math.ceil(catchUpAt - f.now)));
}
