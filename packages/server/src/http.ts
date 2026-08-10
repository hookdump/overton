/**
 * The HTTP surface.
 *
 * Small on purpose. The whole point of Overton is that an orchestrator can ask
 * one question over a socket without adopting anything else, so the API is
 * shaped for a caller that has thirty seconds of patience and a `curl`:
 *
 *   GET  /v1/ask?project=P&account=A     → 200 with a Decision, always
 *   POST /v1/claim                        → open a claim if the answer is go
 *   POST /v1/claim/:id/renew              → heartbeat
 *   POST /v1/claim/:id/release            → close
 *   GET  /v1/accounts  /v1/projects  /v1/ledger  /v1/health
 *
 * A refusal is 200, not 4xx. The request was well-formed and the answer is
 * data — a `wait` is not a client error, and returning 429 invites middleware
 * to retry it on a schedule of its own choosing rather than the one the
 * decision carries.
 *
 * BINDS LOOPBACK BY DEFAULT. There is no authentication because there is no
 * multi-user story: put it behind Tailscale, not behind 0.0.0.0.
 */

import { EXIT_CODE, renderDecision, type Decision } from "@overton/core";
import { accountViews, ledgerView, openClaims, projectViews, type Overton } from "@overton/engine";

export interface ServeOptions {
  host?: string;
  port?: number;
  /** Called after each request, for logging. */
  onRequest?(method: string, path: string, status: number): void;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(body + "\n", { status, headers: { "content-type": "text/plain; charset=utf-8" } });
}

/**
 * Content negotiation by query parameter rather than by `Accept`, because the
 * caller most likely to want prose is a human with a terminal and a URL.
 */
function respondDecision(d: Decision, url: URL): Response {
  if (url.searchParams.get("format") === "text") return text(renderDecision(d));
  return json({ ...d, exitCode: EXIT_CODE[d.verdict] });
}

export function createHandler(o: Overton) {
  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (path === "/" || path === "/v1/health")) {
      return json({
        ok: true,
        accounts: Object.keys(o.cfg.accounts).length,
        projects: Object.keys(o.cfg.projects).length,
        policies: o.cfg.policy.chain,
        now: o.clock(),
      });
    }

    if (req.method === "GET" && path === "/v1/ask") {
      const project = url.searchParams.get("project");
      const account = url.searchParams.get("account");
      if (!project) return json({ error: "missing `project`" }, 400);

      if (!account) {
        // No account named: answer for every account this project may use,
        // best first, so a caller can pick without N round trips.
        const all = o.askAll(project);
        if (url.searchParams.get("format") === "text") {
          return text(all.map(renderDecision).join("\n\n"));
        }
        return json({ project, decisions: all });
      }
      return respondDecision(o.ask(project, account), url);
    }

    if (req.method === "POST" && path === "/v1/claim") {
      const body = (await req.json().catch(() => null)) as {
        project?: string;
        account?: string;
        label?: string;
        pid?: number;
        force?: boolean;
      } | null;
      if (!body?.project || !body?.account) {
        return json({ error: "body must include `project` and `account`" }, 400);
      }
      const res = o.claim(
        { projectId: body.project, accountId: body.account, label: body.label ?? null, pid: body.pid ?? null },
        { force: body.force === true },
      );
      return json({ decision: res.decision, claim: res.claim, forced: res.forced ?? false });
    }

    const claimAction = /^\/v1\/claim\/([^/]+)\/(renew|release)$/.exec(path);
    if (req.method === "POST" && claimAction) {
      const [, id, action] = claimAction;
      const ok = action === "renew" ? o.renew(id!) : o.release(id!);
      // 404 rather than a silent false: a caller renewing a claim that has been
      // reaped needs to know it lost its capacity, not carry on believing it
      // holds a slot it does not.
      return ok ? json({ ok: true, id }) : json({ error: `no open claim \`${id}\`` }, 404);
    }

    if (req.method === "GET" && path === "/v1/accounts") return json(accountViews(o));
    if (req.method === "GET" && path === "/v1/projects") return json(projectViews(o));
    if (req.method === "GET" && path === "/v1/claims") {
      return json(openClaims(o.db, url.searchParams.get("account") ?? undefined));
    }
    if (req.method === "GET" && path === "/v1/ledger") {
      const account = url.searchParams.get("account");
      if (!account) return json({ error: "missing `account`" }, 400);
      return json(ledgerView(o, account, url.searchParams.get("window") ?? undefined));
    }

    return json({ error: `no route for ${req.method} ${path}` }, 404);
  };
}

export function serve(o: Overton, opts: ServeOptions = {}) {
  const handle = createHandler(o);
  return Bun.serve({
    hostname: opts.host ?? o.cfg.server.host,
    port: opts.port ?? o.cfg.server.port,
    async fetch(req) {
      const res = await handle(req);
      opts.onRequest?.(req.method, new URL(req.url).pathname, res.status);
      return res;
    },
  });
}
