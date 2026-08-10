/**
 * Allocation: how many percentage points a project may spend, and by when.
 *
 * The distinction that makes the whole thing work:
 *
 *     dispatchable = weekly_target_pct − interactive_reserve_pct
 *     alloc        = dispatchable × normalised_share
 *
 * So "30% of my weekly window" means 30% of what is available to AGENTS, not
 * 30% of the raw plan. That is the difference between a gate that protects your
 * interactive work and one that eats it.
 */

import {
  FIVE_HOURS,
  WEEK,
  dispatchablePool,
  elapsedFraction,
  fiveHourPool,
  fiveHourShare,
  normalisedShare,
  type AccountConfig,
  type Config,
  type GatedWindowKind,
  type ProjectAccountConfig,
  type ProjectId,
} from "@overton/core";
import type { GateWindow } from "./types.ts";

export function windowKindFor(w: GateWindow): GatedWindowKind {
  return w === "weekly" ? "seven_day" : "five_hour";
}

export function windowSecFor(w: GateWindow): number {
  return w === "weekly" ? WEEK : FIVE_HOURS;
}

/** Percentage points of an account's window that agents may use in total. */
export function dispatchableFor(account: AccountConfig, w: GateWindow): number {
  return w === "weekly" ? dispatchablePool(account) : fiveHourPool(account);
}

/** Percentage points allocated to one project on one account. */
export function allocFor(cfg: Config, projectId: ProjectId, accountId: string, w: GateWindow): number {
  const account = cfg.accounts[accountId];
  if (!account) return 0;
  return dispatchableFor(account, w) * normalisedShare(cfg, projectId, accountId, w);
}

export interface Allowance {
  alloc: number;
  /** How much of the window has passed, 0-1. */
  elapsed: number;
  /** What it may have spent BY NOW. */
  allowance: number;
  floor: number;
  slack: number;
}

/**
 * Pace against the clock, not against 100%.
 *
 * A 7-day budget is only meaningful relative to how much of the week has
 * passed: 59% used is alarming on day one and comfortable on day seven, and
 * ranking accounts by raw percentage gets it exactly backwards.
 *
 * The FLOOR exists because the allowance collapses at a window boundary — the
 * instant the window resets, `elapsed` is 0 and the allowance would be just the
 * slack, stalling the fleet precisely when a fresh week opens with everything
 * to spend. The elapsed term takes over within a day.
 */
export function allowanceFor(args: {
  alloc: number;
  resetsAt: number | null;
  windowSec: number;
  now: number;
  floorPct: number;
  slackPct: number;
}): Allowance {
  const { alloc, resetsAt, windowSec, now, floorPct, slackPct } = args;

  // A window with no reset instant is MISSING DATA, and missing data may only
  // tighten. `elapsed = 1` is the loosest value in this formula — it grants a
  // full window's allowance on day one — and a null reset instant does not mark
  // the window stale, so the gate would silently hand out several times what
  // the clock permits. 0 collapses the allowance to `floor + slack`, which is
  // already the defined-safe value at a window boundary.
  const elapsed = resetsAt == null ? 0 : elapsedFraction(resetsAt, windowSec, now);
  const floor = alloc * floorPct;
  const slack = alloc * slackPct;
  return { alloc, elapsed, allowance: Math.max(floor, elapsed * alloc) + slack, floor, slack };
}

/** Where the project ends the window at its current rate, in points. */
export function projectedFinish(used: number, elapsed: number): number | null {
  if (elapsed <= 0.01) return null;
  return used / elapsed;
}

/**
 * Concurrency ceiling implied by a project's 5-hour share.
 *
 * `burst` mode does not pace the 5-hour window — that window exists to be
 * burned and refills several times a day, so pacing it blocks useful work to
 * protect a budget about to be handed back. What the share governs instead is
 * how much of the account's SIMULTANEOUS capacity one project may hold, so a
 * single project cannot monopolise a refill while another starves.
 *
 * It also gives the fleet a principled cap rather than a magic constant.
 */
export function burstConcurrency(
  account: AccountConfig,
  pa: ProjectAccountConfig,
  normalised: number,
): number {
  void fiveHourShare(pa); // documented as the source of `normalised`
  return Math.max(1, Math.ceil(normalised * account.max_concurrent));
}
