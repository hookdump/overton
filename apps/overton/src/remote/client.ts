/**
 * A client for another Overton's HTTP surface.
 *
 * The shape is lifted from `contrib/paperclip-adapter/src/overton.ts` — same
 * `x-overton` header on every request, same timeout discipline — rather than
 * invented a second time. What differs is the types: the adapter declares its
 * own because it must load with no dependencies, while the CLI already imports
 * `@overton/engine`, so the views are the SERVER'S OWN types. A route that
 * changes shape then breaks `tsc` here instead of producing a table of
 * plausible undefineds.
 *
 * Every failure is a `RemoteError` naming the host. Nothing in this file has a
 * local fallback of any kind: an unreachable arbiter must surface as an error,
 * because a stale local answer that looks authoritative is the one outcome
 * worse than no answer.
 */

import type {
  AccountConfig,
  Claim,
  Decision,
  PolicyConfig,
  ProjectConfig,
} from "@overton/core";
import type { AccountView, LedgerView, ProjectView } from "@overton/engine";

/**
 * Long enough for a sleeping tailnet host to wake and answer, short enough that
 * a gate check does not hang a dispatch loop. The daemon's own work is
 * milliseconds; everything in this budget is network.
 */
const TIMEOUT_MS = 10_000;

export class RemoteError extends Error {
  /** The HTTP status, or null when the request never got an answer at all. */
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "RemoteError";
    this.status = status;
  }
}

/** `{"error": "…"}` is what every route returns; anything else is shown raw. */
function detailOf(body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
  } catch {
    /* not JSON — a proxy's HTML, most likely */
  }
  return body.trim().slice(0, 300) || "(empty body)";
}

export interface HealthView {
  ok: boolean;
  accounts: number;
  projects: number;
  policies: string[];
  /** The arbiter's clock. Ages are computed against it, not against ours. */
  now: number;
}

export interface RemoteConfigView {
  file: string | null;
  accounts: Record<string, AccountConfig>;
  projects: Record<string, ProjectConfig>;
  policy: PolicyConfig;
}

export interface ClaimResult {
  decision: Decision;
  claim: Claim | null;
  forced: boolean;
}

/** What every config write echoes back: the RESULTING allocation, not an ack. */
export interface ConfigEditResult {
  ok: boolean;
  projects: ProjectView[];
}

export class RemoteOverton {
  constructor(readonly baseUrl: string) {}

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        // Overton requires this on every write. A cross-origin form post cannot
        // set a custom header, so demanding one is its CSRF guard — and an API
        // client is exactly who is expected to send it. Sent on reads too: one
        // header everywhere is a smaller thing to get wrong than a rule about
        // which verbs need it.
        headers: { ...(init?.headers as Record<string, string> | undefined), "x-overton": "1" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw new RemoteError(`${this.baseUrl} is unreachable: ${(e as Error).message}`);
    }

    // Read as text first. A misrouted `tailscale serve` answers with HTML, and
    // `res.json()` on that throws a parse error naming neither host nor status
    // — which is the information the reader actually needs.
    const body = await res.text();
    if (!res.ok) {
      throw new RemoteError(
        `${this.baseUrl} returned HTTP ${res.status} for ${path}: ${detailOf(body)}`,
        res.status,
      );
    }
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new RemoteError(
        `${this.baseUrl} answered ${path} with something that is not JSON: ${body.trim().slice(0, 200)}\n` +
          "  is that URL really an Overton? A reverse proxy that swallowed the path answers like this.",
      );
    }
  }

  private send<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.call<T>(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
  }

  health(): Promise<HealthView> {
    return this.call<HealthView>("/v1/health");
  }

  /** The decision carries `exitCode`, so the shell contract survives the wire. */
  ask(project: string, account: string): Promise<Decision & { exitCode: number }> {
    const q = new URLSearchParams({ project, account });
    return this.call<Decision & { exitCode: number }>(`/v1/ask?${q}`);
  }

  askAll(project: string): Promise<{ project: string; decisions: Decision[] }> {
    const q = new URLSearchParams({ project });
    return this.call<{ project: string; decisions: Decision[] }>(`/v1/ask?${q}`);
  }

  accounts(): Promise<AccountView[]> {
    return this.call<AccountView[]>("/v1/accounts");
  }

  projects(): Promise<ProjectView[]> {
    return this.call<ProjectView[]>("/v1/projects");
  }

  claims(account?: string): Promise<Claim[]> {
    const q = account ? `?${new URLSearchParams({ account })}` : "";
    return this.call<Claim[]>(`/v1/claims${q}`);
  }

  ledger(account: string, window?: string): Promise<LedgerView> {
    const q = new URLSearchParams({ account });
    if (window) q.set("window", window);
    return this.call<LedgerView>(`/v1/ledger?${q}`);
  }

  config(): Promise<RemoteConfigView> {
    return this.call<RemoteConfigView>("/v1/config");
  }

  claim(body: { project: string; account: string; label?: string | null; force?: boolean }): Promise<ClaimResult> {
    return this.send<ClaimResult>("POST", "/v1/claim", body);
  }

  /** Throws a 404 `RemoteError` when the claim was reaped — see `renew` in the CLI. */
  renew(id: string): Promise<{ ok: boolean }> {
    return this.send<{ ok: boolean }>("POST", `/v1/claim/${encodeURIComponent(id)}/renew`);
  }

  release(id: string): Promise<{ ok: boolean }> {
    return this.send<{ ok: boolean }>("POST", `/v1/claim/${encodeURIComponent(id)}/release`);
  }

  addProject(body: { id: string; roots: string[]; accounts: Record<string, number> }): Promise<ConfigEditResult> {
    return this.send<ConfigEditResult>("POST", "/v1/config/projects", body);
  }

  setProjectRoots(project: string, roots: string[]): Promise<ConfigEditResult> {
    return this.send<ConfigEditResult>("PATCH", `/v1/config/projects/${encodeURIComponent(project)}`, { roots });
  }

  setShare(project: string, account: string, weight: number): Promise<ConfigEditResult> {
    const path = `/v1/config/projects/${encodeURIComponent(project)}/accounts/${encodeURIComponent(account)}`;
    return this.send<ConfigEditResult>("PUT", path, { weight });
  }

  removeProject(project: string): Promise<ConfigEditResult> {
    return this.send<ConfigEditResult>("DELETE", `/v1/config/projects/${encodeURIComponent(project)}`);
  }
}
