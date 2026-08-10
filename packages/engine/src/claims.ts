/**
 * Claims: who is spending right now.
 *
 * Overton runs nothing, so a claim is not a lease over a worktree — it is a
 * statement that some process is spending on this account for this project. It
 * exists for exactly two reasons: concurrency policy counts them, and
 * attribution needs to know who was active in an interval when there is no cost
 * proxy to divide by.
 *
 * A claim is REAPED rather than trusted. A recorded pid is not a reliable
 * liveness test — engines fork, and the pid we were handed may be a wrapper that
 * exited while its child runs on — so the heartbeat is the authority and the pid
 * is only a hint for a human reading the table.
 */

import { newId, tx, type AccountId, type Claim, type DB, type ProjectId } from "@overton/core";

interface ClaimRow {
  id: string;
  project_id: string;
  account_id: string;
  state: string;
  opened_at: number;
  heartbeat_at: number;
  closed_at: number | null;
  label: string | null;
  pid: number | null;
}

function toClaim(r: ClaimRow): Claim {
  return {
    id: r.id,
    projectId: r.project_id,
    accountId: r.account_id,
    state: r.state as Claim["state"],
    openedAt: r.opened_at,
    heartbeatAt: r.heartbeat_at,
    closedAt: r.closed_at,
    label: r.label,
    pid: r.pid,
  };
}

export interface OpenClaimInput {
  projectId: ProjectId;
  accountId: AccountId;
  label?: string | null;
  pid?: number | null;
}

export function openClaim(db: DB, input: OpenClaimInput, now: number): Claim {
  const id = newId("clm");
  db.query(
    `INSERT INTO claims (id, project_id, account_id, state, opened_at, heartbeat_at, closed_at, label, pid)
     VALUES (?, ?, ?, 'open', ?, ?, NULL, ?, ?)`,
  ).run(id, input.projectId, input.accountId, now, now, input.label ?? null, input.pid ?? null);
  return {
    id,
    projectId: input.projectId,
    accountId: input.accountId,
    state: "open",
    openedAt: now,
    heartbeatAt: now,
    closedAt: null,
    label: input.label ?? null,
    pid: input.pid ?? null,
  };
}

/** @returns false when the claim does not exist or was already closed. */
export function renewClaim(db: DB, id: string, now: number): boolean {
  return db.query("UPDATE claims SET heartbeat_at = ? WHERE id = ? AND state = 'open'").run(now, id).changes > 0;
}

export function closeClaim(db: DB, id: string, now: number): boolean {
  return (
    db.query("UPDATE claims SET state = 'closed', closed_at = ? WHERE id = ? AND state = 'open'").run(now, id)
      .changes > 0
  );
}

export function getClaim(db: DB, id: string): Claim | null {
  const row = db.query<ClaimRow, [string]>("SELECT * FROM claims WHERE id = ?").get(id);
  return row ? toClaim(row) : null;
}

export function openClaims(db: DB, accountId?: AccountId): Claim[] {
  const rows = accountId
    ? db
        .query<ClaimRow, [string]>(
          "SELECT * FROM claims WHERE state = 'open' AND account_id = ? ORDER BY opened_at",
        )
        .all(accountId)
    : db.query<ClaimRow, []>("SELECT * FROM claims WHERE state = 'open' ORDER BY opened_at").all();
  return rows.map(toClaim);
}

export interface ClaimCounts {
  account: number;
  project: number;
}

/**
 * Counted in ONE query so the two numbers describe the same instant. Reading
 * them separately lets a claim close between the counts and produce a project
 * total larger than the account total, which reads as corruption.
 */
export function countClaims(db: DB, accountId: AccountId, projectId: ProjectId): ClaimCounts {
  const row = db
    .query<{ account: number; project: number }, [string, string]>(
      `SELECT COUNT(*) AS account,
              SUM(CASE WHEN project_id = ? THEN 1 ELSE 0 END) AS project
       FROM claims WHERE state = 'open' AND account_id = ?`,
    )
    .get(projectId, accountId);
  return { account: row?.account ?? 0, project: row?.project ?? 0 };
}

/**
 * Expire claims whose heartbeat has gone quiet.
 *
 * Nothing notices when a fleet dies — twenty concurrent runs can fail together
 * and leave their claims held forever, at which point concurrency policy
 * refuses everything and the host sits idle until a human looks. Reaping is
 * what turns that into a self-healing condition.
 *
 * Expired, not closed: the distinction survives into the claims table so
 * "finished" and "vanished" stay tellable apart.
 */
export function reapClaims(db: DB, now: number, leaseSec: number): Claim[] {
  const cutoff = now - leaseSec;
  return tx(db, () => {
    const stale = db
      .query<ClaimRow, [number]>("SELECT * FROM claims WHERE state = 'open' AND heartbeat_at < ?")
      .all(cutoff);
    if (stale.length) {
      db.query("UPDATE claims SET state = 'expired', closed_at = ? WHERE state = 'open' AND heartbeat_at < ?").run(
        now,
        cutoff,
      );
    }
    return stale.map(toClaim);
  });
}
