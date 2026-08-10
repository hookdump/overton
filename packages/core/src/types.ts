/**
 * The domain, in one file.
 *
 * Overton knows about four nouns and nothing else:
 *
 *   Account   a subscription with rolling usage windows (your Claude Max seat)
 *   Project   something that wants to spend from accounts (a repo, a client)
 *   Window    one instance of a vendor's rolling limit, with a reset instant
 *   Claim     an open piece of work holding capacity on an account
 *
 * Deliberately absent: runs, worktrees, tickets, PRs, branches, engines.
 * Those belong to whatever is asking. Overton answers; it does not orchestrate.
 */

export type AccountId = string;
export type ProjectId = string;

/**
 * The bucket for spend that no project claimed — your own terminal sessions,
 * and anything else sharing the subscription. Keeping it as a first-class
 * project is what stops that spend from inflating whichever project happened
 * to be running at the time.
 */
export const INTERACTIVE: ProjectId = "@interactive";

/**
 * Window kinds are open-ended on purpose.
 *
 * `five_hour` and `seven_day` are the two every provider so far reports and the
 * two the built-in policies gate on. A provider may return others (per-model
 * weeklies, a daily request count) and they flow through the ledger and the
 * surfaces untouched — a new vendor with a monthly window does not need a
 * schema change, only a policy that knows to look at it.
 */
export type WindowKind = "five_hour" | "seven_day" | (string & {});

/** The two the default policy chain gates on. */
export const GATED_WINDOWS = ["five_hour", "seven_day"] as const;
export type GatedWindowKind = (typeof GATED_WINDOWS)[number];

export interface WindowReading {
  kind: WindowKind;
  /** 0-100, clamped by the provider. Never negative, never above 100. */
  utilizationPct: number;
  /** Absolute epoch seconds, or null when the vendor did not say. */
  resetsAt: number | null;
  /** Nominal length, used for pacing. A Codex "weekly" may not be 7 days. */
  windowSec: number;
}

/**
 * How much a reading can be trusted.
 *
 *   ok      usable
 *   stale   describes a live window, but spend has happened since
 *   expired the window it describes has ended; every number in it is void
 *   unknown there is no reading, or none for this window
 */
export type Freshness = "ok" | "stale" | "expired" | "unknown";

export interface Reading {
  accountId: AccountId;
  /** The provider plugin id that produced it. */
  provider: string;
  /**
   * When the underlying numbers were true. For a server-side endpoint that is
   * `now`; for a transcript-derived reading it may be hours old, and saying so
   * is the entire job of `freshness`.
   */
  ts: number;
  /** When we looked. `fetchedAt - ts` is the provider's own lag. */
  fetchedAt: number;
  windows: Partial<Record<WindowKind, WindowReading>>;
  /** Recomputed against `now` on read. Never trust the stored value. */
  freshness: Freshness;
  /** `pro` / `max` / `team` — whatever the vendor calls the plan. */
  plan?: string;
}

/** One instance of a vendor window, so the ledger zeroes when the vendor does. */
export interface WindowEpoch {
  id: string;
  accountId: AccountId;
  kind: WindowKind;
  openedAt: number;
  resetsAt: number | null;
  closed: boolean;
}

/**
 * How confidently a slice of spend was attributed to a project.
 *
 *   sole      one candidate; no inference at all
 *   weighted  divided by a measured cost proxy — the normal case
 *   equal     several candidates, no proxy; an even split, flagged as a guess
 *   residual  nothing of ours was running; charged to @interactive
 */
export type AttributionMethod = "sole" | "weighted" | "equal" | "residual";

export interface LedgerEntry {
  accountId: AccountId;
  windowKind: WindowKind;
  windowEpochId: string;
  projectId: ProjectId;
  /** Percentage points of the window. Signed sum over an interval == the delta. */
  pctDelta: number;
  /** Output tokens observed for this project in the interval. */
  costProxy: number;
  method: AttributionMethod;
  ts: number;
}

/** One assistant turn observed in a transcript — the attribution unit. */
export interface CostEvent {
  accountId: AccountId;
  /** The cost-source plugin id. */
  source: string;
  sessionPath: string;
  /** Stable per event, so re-scanning a file is idempotent. */
  eventKey: string;
  ts: number;
  outputTokens: number;
  inputTokens: number;
  model?: string;
  /** Working directory, which is how a session is matched to a project. */
  cwd?: string;
}

export type ClaimState = "open" | "closed" | "expired";

/**
 * An open piece of work.
 *
 * Overton does not run anything, so a claim is not a lease over a worktree —
 * it is a statement that some process is spending on this account for this
 * project right now. It exists for two reasons only: concurrency policy needs
 * to count them, and attribution needs to know who was active in an interval.
 */
export interface Claim {
  id: string;
  projectId: ProjectId;
  accountId: AccountId;
  state: ClaimState;
  openedAt: number;
  /** Advanced by `overton renew`; a claim past its lease is reaped. */
  heartbeatAt: number;
  closedAt: number | null;
  /** Free-form, echoed back in listings. A ticket id, a PR url, a note. */
  label: string | null;
  /** Owning pid when the caller supplied one, for reconciliation. */
  pid: number | null;
}
