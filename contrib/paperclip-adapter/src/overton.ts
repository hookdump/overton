/**
 * A tiny client for Overton's HTTP surface.
 *
 * Deliberately hand-rolled over `fetch` rather than importing `@overton/*`:
 * this package must load inside Paperclip's plugin loader with no runtime
 * dependencies at all, so that a version bump on either side cannot break the
 * gate. The only imports in this package are type-only.
 */

export type Verdict = "go" | "wait" | "ask" | "deny";

export interface Decision {
  verdict: Verdict;
  policy: string;
  summary: string;
  detail: string[];
  remedies: string[];
  retryAfterSec: number | null;
}

export interface AccountView {
  accountId: string;
  provider: string;
  plan: string | null;
  metered: boolean;
  readingAgeSec: number | null;
  windows: Array<{
    kind: string;
    utilizationPct: number;
    resetsAt: number | null;
    resetsIn: string | null;
    freshness: string;
  }>;
  claims: number;
  maxConcurrent: number;
  /** Where the account's credentials live, so the seat can be pinned for free. */
  configDir: string | null;
  codexHome: string | null;
}

export class OvertonError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "OvertonError";
  }
}

const TIMEOUT_MS = 5000;

export class OvertonClient {
  readonly baseUrl: string;

  constructor(baseUrl = "http://127.0.0.1:7787") {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        // Overton requires this on every write. A cross-origin form post cannot
        // set a custom header, so demanding one is its CSRF guard — and an API
        // client is exactly who is expected to send it. Applied to reads too:
        // one header on every request is a smaller thing to get wrong than a
        // rule about which verbs need it.
        headers: { ...(init?.headers as Record<string, string> | undefined), "x-overton": "1" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw new OvertonError(`Overton unreachable at ${this.baseUrl}: ${(e as Error).message}`, e);
    }
    if (!res.ok) {
      throw new OvertonError(`Overton returned HTTP ${res.status} for ${path}: ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  health(): Promise<{ ok: boolean; accounts: number; projects: number; policies: string[] }> {
    return this.call("/v1/health");
  }

  ask(project: string, account: string): Promise<Decision> {
    const q = `project=${encodeURIComponent(project)}&account=${encodeURIComponent(account)}`;
    return this.call<Decision>(`/v1/ask?${q}`);
  }

  accounts(): Promise<AccountView[]> {
    return this.call<AccountView[]>("/v1/accounts");
  }

  /** One account by id, or null. Used to inherit its seat. */
  async account(accountId: string): Promise<AccountView | null> {
    return (await this.accounts()).find((a) => a.accountId === accountId) ?? null;
  }

  async claim(body: {
    project: string;
    account: string;
    label?: string;
    pid?: number;
    force?: boolean;
  }): Promise<string | null> {
    const res = await this.call<{ claim: { id: string } | null }>("/v1/claim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.claim?.id ?? null;
  }

  /** Best-effort. A claim whose heartbeat stops is reaped by Overton anyway. */
  async renew(id: string): Promise<void> {
    try {
      await this.call(`/v1/claim/${encodeURIComponent(id)}/renew`, { method: "POST" });
    } catch {
      /* the reaper is the backstop */
    }
  }

  async release(id: string): Promise<void> {
    try {
      await this.call(`/v1/claim/${encodeURIComponent(id)}/release`, { method: "POST" });
    } catch {
      /* the reaper is the backstop */
    }
  }
}
