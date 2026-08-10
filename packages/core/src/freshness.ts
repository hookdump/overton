/**
 * How much a reading can be trusted, and what that costs a gate.
 *
 * Two rules carry this file:
 *
 *   A reset instant is absolute, so `expired` is the one state that voids a
 *   reading outright: every number in it describes a window that no longer
 *   exists. An expired reading must never produce a retry-after, because its
 *   reset instant is in the past and yields a zero-length backoff that looks
 *   deliberate and turns a polite caller into a hot loop.
 *
 *   A degraded reading may only ever TIGHTEN a gate, never open one.
 *   `applyFreshness` is that rule made mechanical, so no policy has to remember
 *   it and no policy can get it wrong.
 */

import { HOUR } from "./time.ts";
import type { Freshness, Reading, WindowKind, WindowReading } from "./types.ts";

export interface FreshnessConfig {
  /** Age beyond which a short-window reading is `stale`. */
  staleSec: number;
  /** Age beyond which a long-window reading is `stale`. A week barely moves. */
  weekStaleSec: number;
}

export const DEFAULT_FRESHNESS: FreshnessConfig = { staleSec: 150, weekStaleSec: 6 * HOUR };

/**
 * Worse-is-higher. `expired` outranks `unknown` because it is a positive
 * statement (this window is gone) rather than an absence, and both outrank
 * `stale`, which is still gateable.
 */
export const FRESHNESS_SEVERITY: Readonly<Record<Freshness, number>> = {
  ok: 0,
  stale: 1,
  unknown: 2,
  expired: 3,
};

/** The degradation ladder, worst last. Used by the monotonicity property test. */
export const FRESHNESS_LADDER: readonly Freshness[] = ["ok", "stale", "unknown", "expired"];

export function worseFreshness(a: Freshness, b: Freshness): Freshness {
  return FRESHNESS_SEVERITY[a] >= FRESHNESS_SEVERITY[b] ? a : b;
}

/** A window is "long" at 24h or more. Vendor window lengths vary; measure them. */
export function isLongWindow(w: Pick<WindowReading, "windowSec">): boolean {
  return w.windowSec >= 24 * HOUR;
}

/**
 * Freshness of one window. Separate from the reading's, because the states
 * genuinely diverge: a weekly window can be perfectly usable while the 5-hour
 * one beside it has already reset.
 */
export function windowFreshness(
  window: WindowReading | undefined,
  ts: number,
  now: number,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): Freshness {
  if (!window) return "unknown";
  // Checked first: an expired window's age is irrelevant. A reading taken one
  // second ago about a window that reset one second ago is still void.
  if (window.resetsAt != null && now >= window.resetsAt) return "expired";

  const age = now - ts;
  if (age < 0) return "ok"; // clock skew forward is not a reason to distrust it
  return age > (isLongWindow(window) ? cfg.weekStaleSec : cfg.staleSec) ? "stale" : "ok";
}

/**
 * A reading's overall freshness is the WORST of its windows. A reading with no
 * windows at all is `unknown`, except from an unmetered provider, where there
 * is nothing to go stale.
 */
export function readingFreshness(
  reading: Pick<Reading, "ts" | "windows" | "provider">,
  now: number,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): Freshness {
  const windows = Object.values(reading.windows).filter((w): w is WindowReading => w != null);
  if (windows.length === 0) return reading.provider === "unmetered" ? "ok" : "unknown";
  let worst: Freshness = "ok";
  for (const w of windows) worst = worseFreshness(worst, windowFreshness(w, reading.ts, now, cfg));
  return worst;
}

/** Recompute a stored reading's freshness against `now`. Never trust the stored one. */
export function withFreshness<T extends Reading>(
  reading: T,
  now: number,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): T {
  return { ...reading, freshness: readingFreshness(reading, now, cfg) };
}

export function freshnessOf(
  reading: Reading | null | undefined,
  kind: WindowKind,
  now: number,
  cfg: FreshnessConfig = DEFAULT_FRESHNESS,
): Freshness {
  if (!reading) return "unknown";
  if (reading.provider === "unmetered") return "ok";
  return windowFreshness(reading.windows[kind], reading.ts, now, cfg);
}

/**
 * May a policy compute a numeric allowance from a reading in this state?
 *
 * `ok` and `stale` describe a live window. `expired` and `unknown` do not, and
 * under those nothing metered is dispatchable at any size.
 */
export function isUsableForGate(freshness: Freshness): boolean {
  return freshness === "ok" || freshness === "stale";
}

/**
 * May a retry-after be derived from this reading's reset instant?
 *
 * Only from a live window. An expired reading's reset instant is in the past,
 * so a backoff built from it clears immediately.
 */
export function canDeriveRetryAfter(freshness: Freshness): boolean {
  return isUsableForGate(freshness);
}

export interface DegradeInput {
  /** Points a policy would allow on a perfectly fresh reading. */
  allowancePct: number;
  /**
   * Local burn since the reading was taken, in percentage points. Only ever
   * subtracted — it answers "is the cached figure stale in the bad direction,
   * and how badly", never "may we have more".
   */
  burnPct?: number;
}

/**
 * The tightening rule, mechanically: the returned allowance is never greater
 * than `allowancePct`, and is monotonically non-increasing along
 * FRESHNESS_LADDER for any fixed input. There is no argument that makes a
 * degraded reading produce a larger number than a fresh one.
 */
export function applyFreshness(freshness: Freshness, input: DegradeInput): number {
  const base = Math.max(0, input.allowancePct);
  const burn = Math.max(0, input.burnPct ?? 0);
  switch (freshness) {
    case "ok":
      return base;
    case "stale":
      return Math.max(0, base - burn);
    case "expired":
    case "unknown":
      return 0;
  }
}
