/**
 * Which project should be charged for work done in a directory.
 *
 * LONGEST PREFIX WINS. A monorepo subdirectory declared as its own project must
 * beat the repo root that contains it, or every package's spend lands on one
 * project and the split you configured never happens.
 *
 * Anything not under a declared root is `@interactive` — your own work, or
 * another machine sharing the subscription. Naming that bucket rather than
 * spreading it across projects is what keeps the ledger honest.
 */

import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { INTERACTIVE, absolute, type Config, type ProjectId } from "@overton/core";

/** Resolve symlinks where possible; a path that no longer exists is used as-is. */
function canonical(p: string): string {
  const abs = resolve(absolute(p));
  try {
    return realpathSync(abs);
  } catch {
    return abs;
  }
}

function isUnder(child: string, parent: string): boolean {
  if (child === parent) return true;
  // The separator matters: `/a/foobar` is not under `/a/foo`.
  return child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
}

export interface ProjectRoots {
  /** Canonical root → project, longest first. */
  entries: Array<{ root: string; projectId: ProjectId }>;
}

/** Precomputed once per config load; resolving symlinks per event is expensive. */
export function projectRoots(cfg: Config): ProjectRoots {
  const entries: Array<{ root: string; projectId: ProjectId }> = [];
  for (const [projectId, p] of Object.entries(cfg.projects)) {
    if (!p.enabled) continue;
    for (const root of p.roots) entries.push({ root: canonical(root), projectId });
  }
  entries.sort((a, b) => b.root.length - a.root.length);
  return { entries };
}

export function projectForCwd(roots: ProjectRoots, cwd: string | undefined | null): ProjectId {
  if (!cwd) return INTERACTIVE;
  const c = canonical(cwd);
  for (const e of roots.entries) if (isUnder(c, e.root)) return e.projectId;
  return INTERACTIVE;
}
