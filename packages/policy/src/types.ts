/**
 * The policy contract.
 *
 * A policy is a PURE FUNCTION from stated facts to a ruling. It does no IO, has
 * no clock of its own, and reaches for nothing — everything it may consider is
 * in `Facts`. Three things fall out of that:
 *
 *   * every refusal in a test is reproducible from a literal;
 *   * a stored decision can be replayed years later and produce the same answer;
 *   * "why did it refuse at 03:00" is answerable without a debugger.
 *
 * A policy returns `null` for "no opinion". The chain collects every ruling and
 * the WORST one wins, so a policy cannot open a gate another policy closed
 * regardless of the order they run in.
 */

import type {
  AccountConfig,
  AccountId,
  Freshness,
  GatedWindowKind,
  Plugin,
  PolicyConfig,
  ProjectAccountConfig,
  ProjectId,
  Reading,
  Ruling,
  WindowReading,
} from "@overton/core";

export type GateWindow = "weekly" | "five_hour";
export type WindowMode = "pace" | "burst" | "off";

/** Everything known about one window, for one project, at one instant. */
export interface WindowFacts {
  window: GateWindow;
  kind: GatedWindowKind;
  /**
   * Did the vendor report this window at all?
   *
   * A window the vendor never sends is NOT a degraded reading. Some Codex tiers
   * report only a weekly figure; treating that absence as `unknown` refuses
   * every request on a perfectly healthy account.
   */
  reported: boolean;
  freshness: Freshness;
  epochId: string | null;
  reading: WindowReading | null;
  mode: WindowMode;
  /** Points of this window allocated to this project. */
  alloc: number;
  /** Points already attributed to this project in the current epoch. */
  used: number;
  /** What it may have spent BY NOW, given how much of the window has passed. */
  allowance: number;
  /** Fraction of the window elapsed, 0-1. */
  elapsed: number;
  /** Points added because the reading is stale. Only ever tightens. */
  staleAdjustment: number;
  /** Set when the reading is too degraded to gate on honestly. */
  blocked: string | null;
}

export interface Facts {
  now: number;
  projectId: ProjectId;
  accountId: AccountId;
  account: AccountConfig;
  /** Null when this project does not name this account at all. */
  projectAccount: ProjectAccountConfig | null;
  /**
   * This project's share of the account, normalised across every project
   * competing for it. Carried separately from `alloc` because concurrency is a
   * share of *slots*, not of percentage points.
   */
  shares: { weekly: number; fiveHour: number };
  /** False for an unmetered provider: no window, so no budget to be over. */
  metered: boolean;
  reading: Reading | null;
  /** The account's own weekly utilization, for the account-wide stop. */
  accountPct: number | null;
  /** Only the windows this project actually gates on. */
  windows: WindowFacts[];
  claims: {
    /** Open claims this project holds on this account. */
    project: number;
    /** Open claims from every project on this account. */
    account: number;
  };
  /** Can this account's burn be observed locally at all? */
  hasCostSource: boolean;
  policy: PolicyConfig;
  /** Other accounts this project may use, for the "try instead" line. */
  alternatives: Array<{ accountId: AccountId; used: number; alloc: number }>;
}

export interface Policy extends Plugin {
  /** @returns a ruling, or null for no opinion. */
  evaluate(facts: Facts): Ruling | null;
}
