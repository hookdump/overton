/**
 * The unmetered provider: local models, and anything billed somewhere Overton
 * does not arbitrate.
 *
 * It exists so that "free capacity" is a first-class row rather than an absence
 * from config. An unmetered account has no window to be over, so every budget
 * policy skips it — but concurrency policy still applies, because your machine
 * has a finite number of cores whatever the tokens cost.
 */

import { readingFreshness, type AccountConfig, type AccountId, type Reading } from "@overton/core";
import type { Provider, ProviderContext } from "./types.ts";

export class UnmeteredProvider implements Provider {
  readonly id = "unmetered";
  readonly description = "Local or separately-billed capacity — no window to spend";
  readonly metered = false;

  async check(): Promise<string[]> {
    return [];
  }

  async read(accountId: AccountId, _account: AccountConfig, ctx: ProviderContext): Promise<Reading> {
    const reading: Reading = {
      accountId,
      provider: "unmetered",
      ts: ctx.now,
      fetchedAt: ctx.now,
      windows: {},
      freshness: "ok",
    };
    // Goes through the same path as everything else so the one case where "no
    // windows" is not "unknown" lives in one place rather than two.
    reading.freshness = readingFreshness(reading, ctx.now, ctx.freshness);
    return reading;
  }
}
