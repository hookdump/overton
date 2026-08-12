/**
 * The tables, as functions of the views.
 *
 * Pulled out of the commands so that the local path and the remote path cannot
 * drift: both hand the same view objects to the same function. `overton status`
 * and `overton --remote e16 status` are then the same table with different
 * numbers by construction, rather than by two people remembering to edit two
 * places — and a column that appeared in one and not the other is exactly the
 * kind of difference that makes someone doubt which host answered.
 */

import { bar, humanDuration, table, type Claim } from "@overton/core";
import type { AccountView, LedgerView, ProjectView } from "@overton/engine";

export function renderStatus(accounts: AccountView[], projects: ProjectView[]): string {
  const acct = table(
    ["ACCOUNT", "PROVIDER", "PLAN", "7d", "5h", "READING", "CLAIMS"],
    accounts.map((a) => {
      const w7 = a.windows.find((w) => w.kind === "seven_day");
      const w5 = a.windows.find((w) => w.kind === "five_hour");
      return [
        a.accountId + (a.enabled ? "" : " (off)"),
        a.provider,
        a.plan ?? "—",
        w7 ? `${bar(w7.utilizationPct)} ${w7.utilizationPct.toFixed(0)}%` : a.metered ? "—" : "unmetered",
        w5 ? `${w5.utilizationPct.toFixed(0)}%` : "—",
        a.readingAgeSec == null ? "never" : `${humanDuration(a.readingAgeSec)} ago`,
        `${a.claims}/${a.maxConcurrent}`,
      ];
    }),
  );

  const rows: string[][] = [];
  for (const p of projects) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        `${a.used.toFixed(1)}/${a.allowance.toFixed(1)}`,
        a.pace,
        a.verdict + (a.retryAfterSec ? ` ${humanDuration(a.retryAfterSec)}` : ""),
      ]);
    }
  }
  const proj = table(["PROJECT", "ACCOUNT", "SHARE", "USED/ALLOWED", "PACE", "VERDICT"], rows);
  return `${acct}\n\n${proj}`;
}

export function renderWindows(accounts: AccountView[]): string {
  const rows: string[][] = [];
  for (const a of accounts) {
    if (!a.windows.length) {
      rows.push([a.accountId, a.metered ? "(no reading)" : "unmetered", "", "", ""]);
      continue;
    }
    for (const w of a.windows) {
      rows.push([
        a.accountId,
        w.kind,
        `${bar(w.utilizationPct)} ${w.utilizationPct.toFixed(1)}%`,
        w.resetsIn ? `in ${w.resetsIn}` : "unknown",
        w.freshness,
      ]);
    }
  }
  return table(["ACCOUNT", "WINDOW", "USED", "RESETS", "FRESHNESS"], rows);
}

export function renderProjects(views: ProjectView[]): string {
  const rows: string[][] = [];
  for (const p of views) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        a.alloc.toFixed(1),
        a.used.toFixed(1),
        a.allowance.toFixed(1),
        `${a.elapsedPct.toFixed(0)}%`,
        a.pace,
      ]);
    }
  }
  return table(["PROJECT", "ACCOUNT", "SHARE", "ALLOC", "USED", "ALLOWED", "ELAPSED", "PACE"], rows);
}

export function renderLedger(view: LedgerView): string {
  const rows = view.rows.map((r) => [
    r.projectId,
    `${r.pct.toFixed(2)} pts`,
    r.proxy.toLocaleString(),
    `${r.confidencePct.toFixed(0)}%`,
  ]);
  const body = table(["PROJECT", "ATTRIBUTED", "OUTPUT TOKENS", "CONFIDENCE"], rows);

  // The comparison that says whether attribution is working at all. They will
  // not match exactly — the ledger starts when Overton does — but a widening
  // gap means a spend source is being missed.
  const gap =
    view.vendorPct != null
      ? `\n\nvendor says ${view.vendorPct.toFixed(1)}% · attributed ${view.attributed.toFixed(1)} pts` +
        `\n  the difference is spend from before this epoch was first observed, or from a source ` +
        `Overton cannot see`
      : "";
  return `${view.accountId} · ${view.windowKind} · epoch ${view.epochId ?? "none"}\n\n${body}${gap}`;
}

/**
 * `now` is passed rather than read, because a claim's age must be measured
 * against the clock of the host holding it. Two machines are never quite in
 * sync, and a negative age reads as corruption.
 */
export function renderClaims(claims: Claim[], now: number): string {
  if (!claims.length) return "no open claims";
  return table(
    ["CLAIM", "PROJECT", "ACCOUNT", "AGE", "LAST BEAT", "LABEL"],
    claims.map((c) => [
      c.id,
      c.projectId,
      c.accountId,
      humanDuration(now - c.openedAt),
      humanDuration(now - c.heartbeatAt) + " ago",
      c.label ?? "",
    ]),
  );
}

/** The allocation after an edit, with the project that was edited starred. */
export function renderSplit(views: ProjectView[], edited: string): string {
  const rows: string[][] = [];
  for (const p of views) {
    for (const a of p.accounts) {
      rows.push([
        p.projectId === edited ? `${p.projectId} *` : p.projectId,
        a.accountId,
        `${a.sharePct.toFixed(0)}%`,
        a.alloc.toFixed(1),
        a.pace,
      ]);
    }
  }
  return table(["PROJECT", "ACCOUNT", "SHARE", "ALLOC", "PACE"], rows);
}
