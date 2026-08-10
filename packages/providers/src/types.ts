/**
 * The provider contract.
 *
 * A provider reads one account's windows from that vendor's own authority.
 * Adding a vendor is writing one of these and registering it — nothing else in
 * Overton changes.
 *
 * THE ONE RULE: a provider returns `null` only when there is genuinely nothing
 * to read, and throws when it could not read. It never fabricates a zero.
 * "Unknown" and "0% used" produce opposite decisions in the gate, and a
 * provider that blurs them turns a broken credential into an open budget.
 */

import type { AccountConfig, AccountId, Plugin, Reading } from "@overton/core";
import type { FreshnessConfig } from "@overton/core";

export interface ProviderContext {
  now: number;
  freshness: FreshnessConfig;
  /** Injected so tests never touch the network. */
  fetch: typeof globalThis.fetch;
  env: NodeJS.ProcessEnv;
}

export interface Provider extends Plugin {
  /**
   * Does this account have a window at all? An unmetered provider says false,
   * and every budget policy then skips it — there is no budget to be over.
   */
  readonly metered: boolean;

  /**
   * Fail fast at startup with a human fix, rather than at 03:00 with a stack
   * trace. Return the problems; an empty array means ready.
   */
  check(accountId: AccountId, account: AccountConfig, ctx: ProviderContext): Promise<string[]>;

  /**
   * @returns the current reading, or `null` when the source exists but has
   *          nothing in it yet (a vendor whose CLI has never run here).
   * @throws  ProviderError on a transport, auth or schema failure. Callers
   *          degrade the account to `unknown`, which can only tighten a gate.
   */
  read(accountId: AccountId, account: AccountConfig, ctx: ProviderContext): Promise<Reading | null>;
}

export type ProviderErrorKind = "auth" | "transport" | "ratelimited" | "schema" | "missing";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly kind: ProviderErrorKind,
    /** Is another attempt in a few minutes worth making? */
    readonly retryable = true,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
