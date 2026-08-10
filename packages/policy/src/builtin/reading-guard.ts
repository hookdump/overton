/**
 * The honesty guard: refuse when the reading is too degraded to gate on.
 *
 * This is the policy that makes every other policy's arithmetic meaningful. A
 * degraded reading may only ever tighten a gate, never open one — so when we
 * cannot price what has been spent since the last reading, the answer is "wait",
 * not "probably fine".
 *
 * Note the polarity. Missing the MEANS to measure is itself missing data: an
 * account with no local transcript source can never observe burn, so a
 * staleness check against it would pass vacuously at any age, indistinguishable
 * from a fresh reading while real spend happens on another machine sharing the
 * subscription.
 */

import { humanDuration, wait, type Ruling } from "@overton/core";
import type { Facts, Policy } from "../types.ts";

export class ReadingGuardPolicy implements Policy {
  readonly id = "reading-guard";
  readonly description = "Refuses when the reading is too degraded to gate on honestly";

  evaluate(f: Facts): Ruling | null {
    if (!f.metered) return null;

    const blocked = f.windows.find((w) => w.blocked);
    if (!blocked) return null;

    const age = f.reading ? humanDuration(f.now - f.reading.ts) : null;
    return wait(`cannot gate ${f.accountId} honestly: ${blocked.blocked}`, {
      detail: [
        "a degraded reading may only tighten a gate, never open one",
        f.reading ? `last reading ${age} old, from provider \`${f.reading.provider}\`` : "no reading at all",
      ],
      remedies: [
        `wait for the next poll (this account meters every ${f.account.meter_interval_sec}s)`,
        "use an unmetered account for this piece of work",
        "overton doctor — check the account's credentials",
      ],
      // One poll interval, not the window reset: the reading is what is broken,
      // and it is due to be replaced shortly.
      retryAfterSec: f.account.meter_interval_sec,
    });
  }
}
