/**
 * The runtime: one object that owns the database, the config and the three
 * registries, and exposes the four verbs everything else is a projection of.
 *
 *   meter    read every account's windows from its vendor
 *   settle   attribute the observed delta to projects
 *   ask      decide whether a project may spend on an account
 *   claim    ask, and hold capacity if the answer was yes
 *
 * The CLI, the HTTP API and the MCP server all call these and render the
 * result. None of them contains a decision of its own.
 */

import {
  DAY,
  Registry,
  systemClock,
  type Clock,
  type Config,
  type DB,
  type Decision,
  type FreshnessConfig,
  type ProjectId,
  type Reading,
} from "@overton/core";
import { defaultProviders, ProviderError, type Provider, type ProviderContext } from "@overton/providers";
import {
  attribute,
  closeElapsedEpochs,
  defaultCostSources,
  lastScanMtime,
  projectForCwd,
  projectRoots,
  saveAttribution,
  saveCostEvents,
  syncEpochs,
  type CostSource,
  type ProjectRoots,
  type UncorroboratedDrop,
} from "@overton/ledger";
import { defaultPolicies, recordDecision, runChain, type Policy } from "@overton/policy";
import { buildFacts } from "./facts.ts";
import { closeClaim, countClaims, openClaim, reapClaims, renewClaim, type OpenClaimInput } from "./claims.ts";
import { latestReading, previousReading, pruneReadings, saveReading } from "./readings.ts";

export interface OvertonOptions {
  db: DB;
  cfg: Config;
  clock?: Clock;
  providers?: Registry<Provider>;
  costSources?: Registry<CostSource>;
  policies?: Registry<Policy>;
  fetch?: typeof globalThis.fetch;
  env?: NodeJS.ProcessEnv;
  /**
   * Path the config was loaded from. Required only for the write surfaces —
   * editing is refused rather than guessed when it is absent, because writing
   * to the wrong file is worse than not writing at all.
   */
  configFile?: string;
}

export interface MeterResult {
  accountId: string;
  reading: Reading | null;
  /** Points attributed this tick, per window kind. */
  attributed: Record<string, number>;
  rolled: string[];
  uncorroborated: UncorroboratedDrop[];
  costEvents: number;
  error: string | null;
}

export class Overton {
  readonly db: DB;
  readonly cfg: Config;
  readonly clock: Clock;
  readonly providers: Registry<Provider>;
  readonly costSources: Registry<CostSource>;
  readonly policies: Registry<Policy>;
  readonly configFile: string | null;
  private readonly roots: ProjectRoots;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly env: NodeJS.ProcessEnv;

  constructor(opts: OvertonOptions) {
    this.db = opts.db;
    this.cfg = opts.cfg;
    this.clock = opts.clock ?? systemClock;
    this.providers = opts.providers ?? defaultProviders();
    this.costSources = opts.costSources ?? defaultCostSources();
    this.policies = opts.policies ?? defaultPolicies();
    this.configFile = opts.configFile ?? null;
    this.roots = projectRoots(opts.cfg);
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    this.env = opts.env ?? process.env;
  }

  get freshness(): FreshnessConfig {
    return {
      staleSec: this.cfg.policy.freshness.stale_sec,
      weekStaleSec: this.cfg.policy.freshness.week_stale_sec,
    };
  }

  private providerFor(accountId: string): Provider {
    const account = this.cfg.accounts[accountId];
    if (!account) throw new Error(`unknown account \`${accountId}\``);
    return this.providers.get(account.provider);
  }

  private ctx(now: number): ProviderContext {
    return { now, freshness: this.freshness, fetch: this.fetchImpl, env: this.env };
  }

  /** The chain, resolved from config. Unknown ids fail loudly at first use. */
  private chain(): Policy[] {
    return this.policies.select(this.cfg.policy.chain);
  }

  // -------------------------------------------------------------------------
  // ask
  // -------------------------------------------------------------------------

  /**
   * May `projectId` spend on `accountId` right now?
   *
   * Pure with respect to the world: it reads, it never writes — except for the
   * audit row, which is written because a gate nobody can review after the fact
   * is a gate nobody trusts.
   */
  ask(projectId: ProjectId, accountId: string, opts: { record?: boolean } = {}): Decision {
    const now = this.clock();
    const account = this.cfg.accounts[accountId];
    if (!account) {
      return this.syntheticDeny(projectId, accountId, now, `unknown account \`${accountId}\``, [
        "check the `accounts` block in config.yaml",
      ]);
    }
    if (!account.enabled) {
      return this.syntheticDeny(projectId, accountId, now, `${accountId} is disabled`, [
        `set accounts.${accountId}.enabled: true`,
      ]);
    }

    const facts = buildFacts({
      db: this.db,
      cfg: this.cfg,
      projectId,
      accountId,
      now,
      freshness: this.freshness,
      metered: this.providerFor(accountId).metered,
    });

    const decision = runChain(this.chain(), facts);
    if (opts.record !== false) recordDecision(this.db, decision);
    return decision;
  }

  /**
   * Ask every account this project may use, best first.
   *
   * "Best" is the most headroom as a fraction of allocation, not the lowest raw
   * percentage — an account at 60% of a large allocation has more left than one
   * at 30% of a tiny one, and ranking by the raw number gets that backwards.
   */
  askAll(projectId: ProjectId): Decision[] {
    const ids = Object.keys(this.cfg.projects[projectId]?.accounts ?? {});
    const decisions = ids.map((id) => this.ask(projectId, id, { record: false }));
    return decisions.sort((a, b) => {
      if (a.verdict !== b.verdict) {
        return a.verdict === "go" ? -1 : b.verdict === "go" ? 1 : 0;
      }
      return (a.retryAfterSec ?? Infinity) - (b.retryAfterSec ?? Infinity);
    });
  }

  private syntheticDeny(
    projectId: ProjectId,
    accountId: string,
    now: number,
    summary: string,
    remedies: string[],
  ): Decision {
    return {
      verdict: "deny",
      policy: "config",
      summary,
      detail: [],
      remedies,
      retryAfterSec: null,
      rulings: [],
      request: { project: projectId, account: accountId, at: now },
    };
  }

  // -------------------------------------------------------------------------
  // claim
  // -------------------------------------------------------------------------

  /**
   * Ask, and if the answer is `go`, hold capacity.
   *
   * CAPACITY IS RESERVED AT CHECK TIME, not at launch time. A caller that asks,
   * spends sixty seconds preparing a workspace and only then opens its claim
   * gives every other caller a sixty-second window to pass the same check — and
   * they all will. The claim row is the reservation, so the gap does not exist.
   */
  claim(input: OpenClaimInput, opts: { force?: boolean } = {}) {
    const decision = this.ask(input.projectId, input.accountId);
    if (decision.verdict !== "go" && !opts.force) return { decision, claim: null };
    const claim = openClaim(this.db, input, this.clock());
    return { decision, claim, forced: decision.verdict !== "go" };
  }

  renew(id: string): boolean {
    return renewClaim(this.db, id, this.clock());
  }

  release(id: string): boolean {
    return closeClaim(this.db, id, this.clock());
  }

  countClaims(accountId: string, projectId: ProjectId) {
    return countClaims(this.db, accountId, projectId);
  }

  // -------------------------------------------------------------------------
  // meter + settle
  // -------------------------------------------------------------------------

  /**
   * One account: read the provider, scan its transcripts, roll epochs, and
   * attribute the delta.
   *
   * Ordering is load-bearing. Cost events are scanned BEFORE attribution so the
   * proxy covering this interval already exists; attributing first would divide
   * the delta by an empty set and charge it all to @interactive.
   */
  async meterAccount(accountId: string): Promise<MeterResult> {
    const now = this.clock();
    const account = this.cfg.accounts[accountId]!;
    const result: MeterResult = {
      accountId,
      reading: null,
      attributed: {},
      rolled: [],
      uncorroborated: [],
      costEvents: 0,
      error: null,
    };

    result.costEvents = this.scanCosts(accountId, now);

    const prev = latestReading(this.db, accountId, now, this.freshness);

    let reading: Reading | null;
    try {
      reading = await this.providerFor(accountId).read(accountId, account, this.ctx(now));
    } catch (e) {
      // A provider failure degrades the account to "no fresh reading", which
      // can only tighten a gate. It is never treated as "the account is empty".
      result.error = e instanceof ProviderError ? `${e.kind}: ${e.message}` : (e as Error).message;
      return result;
    }
    if (!reading) return result;

    result.reading = reading;
    saveReading(this.db, reading);

    const { synced, uncorroborated } = syncEpochs(this.db, reading, prev, now);
    result.uncorroborated = uncorroborated;
    result.rolled = synced.filter((s) => s.rolled).map((s) => s.kind);

    // Attribute the delta per window. A rolled epoch contributes nothing: the
    // drop from 96% to 2% is a reset, not a refund.
    for (const s of synced) {
      if (s.rolled || !prev) continue;
      const before = prev.windows[s.kind];
      const after = reading.windows[s.kind];
      if (!before || !after) continue;
      const deltaPct = after.utilizationPct - before.utilizationPct;
      if (!(deltaPct > 0)) continue;

      const { entries } = attribute(this.db, {
        accountId,
        windowKind: s.kind,
        windowEpochId: s.epochId,
        t0: prev.ts,
        t1: reading.ts,
        deltaPct,
      });
      saveAttribution(this.db, entries, prev.ts);
      result.attributed[s.kind] = deltaPct;
    }

    return result;
  }

  /** Every enabled account, concurrently. One failure never stops the others. */
  async meter(): Promise<MeterResult[]> {
    const ids = Object.entries(this.cfg.accounts)
      .filter(([, a]) => a.enabled)
      .map(([id]) => id);
    return Promise.all(
      ids.map((id) =>
        this.meterAccount(id).catch((e) => ({
          accountId: id,
          reading: null,
          attributed: {},
          rolled: [],
          uncorroborated: [],
          costEvents: 0,
          error: (e as Error).message,
        })),
      ),
    );
  }

  /** Scan every cost source that supports this account. */
  private scanCosts(accountId: string, now: number): number {
    const account = this.cfg.accounts[accountId]!;
    let stored = 0;
    for (const source of this.costSources.all()) {
      if (!source.supports(account)) continue;
      // Re-scan from a little before the last known mtime: a file written in
      // the same second as the previous scan would otherwise be skipped.
      const since = Math.max(0, lastScanMtime(this.db, accountId) - 60);
      const { events, cursors } = source.scan(this.db, accountId, account, since);
      stored += saveCostEvents(this.db, accountId, events, cursors, (e) => projectForCwd(this.roots, e.cwd), now);
    }
    return stored;
  }

  /**
   * Housekeeping: reap dead claims, close elapsed epochs, trim history.
   * Safe to call as often as you like; every step is idempotent.
   */
  tick(): { reaped: number; closedEpochs: number; prunedReadings: number } {
    const now = this.clock();
    const reaped = reapClaims(this.db, now, this.cfg.policy.claim_lease_sec);
    return {
      reaped: reaped.length,
      closedEpochs: closeElapsedEpochs(this.db, now),
      prunedReadings: pruneReadings(this.db, now - 30 * DAY),
    };
  }

  // -------------------------------------------------------------------------
  // introspection
  // -------------------------------------------------------------------------

  latestReading(accountId: string): Reading | null {
    return latestReading(this.db, accountId, this.clock(), this.freshness);
  }

  previousReading(accountId: string): Reading | null {
    return previousReading(this.db, accountId, this.clock(), this.freshness);
  }

  facts(projectId: ProjectId, accountId: string) {
    return buildFacts({
      db: this.db,
      cfg: this.cfg,
      projectId,
      accountId,
      now: this.clock(),
      freshness: this.freshness,
      metered: this.providerFor(accountId).metered,
    });
  }

  /** Config and credential checks, with a human fix for each problem. */
  async doctor(): Promise<Array<{ accountId: string; problems: string[] }>> {
    const now = this.clock();
    const out: Array<{ accountId: string; problems: string[] }> = [];
    for (const [accountId, account] of Object.entries(this.cfg.accounts)) {
      if (!account.enabled) continue;
      const problems: string[] = [];
      let provider: Provider | null = null;
      try {
        provider = this.providerFor(accountId);
      } catch (e) {
        problems.push((e as Error).message);
      }
      if (provider) problems.push(...(await provider.check(accountId, account, this.ctx(now))));
      out.push({ accountId, problems });
    }
    return out;
  }
}
