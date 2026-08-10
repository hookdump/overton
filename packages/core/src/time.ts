/**
 * Time, in absolute epoch seconds. Never durations on disk.
 *
 * A vendor's `resets_at` is an absolute instant, so there is no timezone
 * arithmetic to get wrong — the single most common way a backoff schedule
 * silently misfires. Every stored instant in Overton is epoch seconds;
 * durations exist only as computed values at the point of use.
 */

export const SECOND = 1;
export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;
export const WEEK = 604800;
export const FIVE_HOURS = 5 * HOUR;

/** Current time in epoch seconds. Injectable so tests never touch the wall clock. */
export type Clock = () => number;

export const systemClock: Clock = () => Math.floor(Date.now() / 1000);

/** A fixed clock, for tests and for replaying a decision exactly as it was made. */
export function fixedClock(at: number): Clock {
  return () => at;
}

/**
 * Parse an ISO-8601 timestamp (Anthropic) or a bare epoch (Codex) into epoch
 * seconds. Returns null rather than NaN: an unparseable instant is missing
 * data, and missing data has to be distinguishable from zero.
 */
export function toEpoch(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    // Tolerate milliseconds: any plausible epoch-seconds value is < 1e11.
    return value > 1e11 ? Math.floor(value / 1000) : Math.floor(value);
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n) && value.trim() !== "") return toEpoch(n);
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }
  return null;
}

/**
 * How much of a window has elapsed, as a fraction in [0, 1].
 *
 * Derived from the reset instant rather than from a record of when the window
 * opened — there is no such record, and reconstructing one from message
 * timestamps is how pacing drifts.
 */
export function elapsedFraction(resetsAt: number, windowSec: number, now: number): number {
  if (!Number.isFinite(resetsAt) || windowSec <= 0) return 0;
  const remaining = resetsAt - now;
  return Math.max(0, Math.min(1, (windowSec - remaining) / windowSec));
}

/** Human-readable duration, for CLI and API prose only. */
export function humanDuration(seconds: number): string {
  // Round UP the unit ladder before splitting, rather than rounding a
  // remainder: 7199s is 1h and 59.98m, which renders "1h60m" if the remainder
  // is rounded in place, and 86399s carries all the way to "24h" if the carry
  // is only propagated one level.
  const s = Math.max(0, Math.round(seconds));
  if (s < MINUTE) return `${s}s`;

  const mins = Math.round(s / MINUTE);
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h${m}m` : `${h}h`;
  }

  const hours = Math.round(mins / 60);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d${h}h` : `${d}d`;
}
