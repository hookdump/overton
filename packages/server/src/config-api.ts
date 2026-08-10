/**
 * The write surface: editing config.yaml over HTTP.
 *
 * Every route validates before it writes and returns the RESULTING allocation,
 * not just an acknowledgement. Shares are normalised, so changing one project's
 * weight silently changes every other project's percentage — a UI that echoed
 * back only "saved" would leave the operator to guess at the consequence of
 * their own edit.
 */

import {
  ConfigError,
  addProject,
  loadConfigDoc,
  removeProject,
  revokeAccount,
  saveConfigDoc,
  setAccountField,
  setProjectEnabled,
  setProjectRoots,
  setShare,
  ACCOUNT_FIELDS,
  type AccountField,
  type ConfigDoc,
} from "@overton/core";
import { Overton, projectViews } from "@overton/engine";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/**
 * Apply an edit and report the new split.
 *
 * The document is re-read from disk for every request rather than cached: the
 * file is also hand-edited, and writing a stale document back would silently
 * revert whatever someone changed in their editor.
 */
async function edit(o: Overton, apply: (cd: ConfigDoc) => void): Promise<Response> {
  if (!o.configFile) {
    return json({ error: "this Overton was started without a config file, so it cannot edit one" }, 409);
  }
  let cfg;
  try {
    const cd = loadConfigDoc(o.configFile);
    apply(cd);
    cfg = saveConfigDoc(cd);
  } catch (e) {
    // A rejected edit leaves disk untouched, so the message is the whole story.
    return json({ error: e instanceof ConfigError ? e.message : (e as Error).message }, 400);
  }

  // Recomputed against the config just written, NOT against `o` — which was
  // resolved before the write and would echo back the allocation the operator
  // had a moment ago. Shares are normalised, so an edit to one project moves
  // every other project's percentage, and stale numbers here would report the
  // opposite of what the edit did.
  const next = new Overton({ db: o.db, cfg, configFile: o.configFile, clock: o.clock });
  return json({ ok: true, projects: projectViews(next) });
}

export async function handleConfig(o: Overton, req: Request, path: string): Promise<Response | null> {
  if (!path.startsWith("/v1/config")) return null;

  if (req.method === "GET" && path === "/v1/config") {
    return json({
      file: o.configFile,
      accounts: o.cfg.accounts,
      projects: o.cfg.projects,
      policy: o.cfg.policy,
    });
  }

  const body = req.method === "GET" ? {} : ((await req.json().catch(() => ({}))) as Record<string, unknown>);

  // PUT /v1/config/projects/:project/accounts/:account   { weight }
  let m = /^\/v1\/config\/projects\/([^/]+)\/accounts\/([^/]+)$/.exec(path);
  if (m) {
    const [, project, account] = m.map(decodeURIComponent) as [string, string, string];
    if (req.method === "DELETE") return edit(o, (cd) => revokeAccount(cd, project, account));
    if (req.method === "PUT") {
      const weight = num(body.weight);
      if (weight == null || weight < 0) return json({ error: "`weight` must be a number >= 0" }, 400);
      return edit(o, (cd) => setShare(cd, project, account, weight));
    }
  }

  // POST /v1/config/projects   { id, roots[], accounts{} }
  if (req.method === "POST" && path === "/v1/config/projects") {
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return json({ error: "`id` is required" }, 400);
    const roots = Array.isArray(body.roots) ? body.roots.filter((r): r is string => typeof r === "string") : [];
    const accounts: Record<string, number> = {};
    if (body.accounts && typeof body.accounts === "object") {
      for (const [k, v] of Object.entries(body.accounts as Record<string, unknown>)) {
        const w = num(v);
        if (w != null && w >= 0) accounts[k] = w;
      }
    }
    return edit(o, (cd) => addProject(cd, { id, roots, accounts }));
  }

  // /v1/config/projects/:project
  m = /^\/v1\/config\/projects\/([^/]+)$/.exec(path);
  if (m) {
    const project = decodeURIComponent(m[1]!);
    if (req.method === "DELETE") return edit(o, (cd) => removeProject(cd, project));
    if (req.method === "PATCH") {
      return edit(o, (cd) => {
        if (Array.isArray(body.roots)) {
          setProjectRoots(cd, project, body.roots.filter((r): r is string => typeof r === "string"));
        }
        if (typeof body.enabled === "boolean") setProjectEnabled(cd, project, body.enabled);
      });
    }
  }

  // PATCH /v1/config/accounts/:account   { weekly_target_pct, ... }
  m = /^\/v1\/config\/accounts\/([^/]+)$/.exec(path);
  if (m && req.method === "PATCH") {
    const account = decodeURIComponent(m[1]!);
    const updates: Array<[AccountField, number]> = [];
    for (const field of ACCOUNT_FIELDS) {
      if (!(field in body)) continue;
      const v = num(body[field]);
      if (v == null) return json({ error: `\`${field}\` must be a number` }, 400);
      updates.push([field, v]);
    }
    if (!updates.length) return json({ error: `nothing to change — send one of ${ACCOUNT_FIELDS.join(", ")}` }, 400);
    return edit(o, (cd) => {
      for (const [field, value] of updates) setAccountField(cd, account, field, value);
    });
  }

  return json({ error: `no config route for ${req.method} ${path}` }, 404);
}
