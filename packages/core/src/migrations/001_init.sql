-- Overton's whole schema. One file, plain SQL, no ORM: a component that guards
-- your budget should be auditable by reading it.

CREATE TABLE kv (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- One row per (account, provider poll). Retained as history so the ledger can
-- be recomputed from source, and so `overton windows --since` can show a curve.
CREATE TABLE readings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT    NOT NULL,
  provider   TEXT    NOT NULL,
  ts         INTEGER NOT NULL,   -- when the numbers were true
  fetched_at INTEGER NOT NULL,   -- when we looked
  plan       TEXT,
  windows    TEXT    NOT NULL    -- JSON: { kind: WindowReading }
);
CREATE INDEX readings_account_ts ON readings (account_id, ts DESC);

-- One row per instance of a vendor window. The indirection is what makes
-- attribution zero at exactly the moment the vendor's window zeroes; without
-- it every gate carries one window's history forward and drifts.
CREATE TABLE window_epochs (
  id         TEXT    PRIMARY KEY,
  account_id TEXT    NOT NULL,
  kind       TEXT    NOT NULL,
  opened_at  INTEGER NOT NULL,
  resets_at  INTEGER,
  closed     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (account_id, kind, opened_at)
);
CREATE INDEX window_epochs_open ON window_epochs (account_id, kind, closed, opened_at DESC);

-- Attribution. INVARIANT: for any interval, SUM(pct_delta) equals the observed
-- delta exactly. We may be wrong about WHO spent it; we are never wrong about
-- how much. `method` records how much inference each row involved.
CREATE TABLE ledger (
  account_id      TEXT    NOT NULL,
  window_kind     TEXT    NOT NULL,
  window_epoch_id TEXT    NOT NULL,
  project_id      TEXT    NOT NULL,
  pct_delta       REAL    NOT NULL,
  cost_proxy      REAL    NOT NULL DEFAULT 0,
  method          TEXT    NOT NULL,
  interval_start  INTEGER NOT NULL,
  ts              INTEGER NOT NULL,
  -- Idempotent per interval: re-running attribution after a crash replaces
  -- rather than doubles.
  PRIMARY KEY (account_id, window_kind, window_epoch_id, project_id, interval_start)
) WITHOUT ROWID;
CREATE INDEX ledger_epoch ON ledger (account_id, window_kind, window_epoch_id);

-- Observed spend, per assistant turn, from local transcripts. The unit
-- attribution divides a metered delta by.
CREATE TABLE cost_events (
  account_id    TEXT    NOT NULL,
  source        TEXT    NOT NULL,
  session_path  TEXT    NOT NULL,
  event_key     TEXT    NOT NULL,
  ts            INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  input_tokens  INTEGER NOT NULL,
  model         TEXT,
  cwd           TEXT,
  project_id    TEXT    NOT NULL,
  -- Content-derived, never position-derived: an index within a parse shifts the
  -- moment a read window slides, and dedup then stops working.
  PRIMARY KEY (session_path, event_key)
) WITHOUT ROWID;
CREATE INDEX cost_events_account_ts ON cost_events (account_id, ts);

-- Resume points for incremental JSONL scanning. Advanced only after the events
-- they cover are committed, so a crash re-reads a tail rather than losing it.
CREATE TABLE scan_state (
  path       TEXT PRIMARY KEY,
  account_id TEXT    NOT NULL,
  size       INTEGER NOT NULL,
  mtime      INTEGER NOT NULL,
  offset     INTEGER NOT NULL,
  scanned_at INTEGER NOT NULL
) WITHOUT ROWID;

-- Open work holding capacity. Not a lease over a worktree — Overton runs
-- nothing — just a statement that someone is spending here right now.
CREATE TABLE claims (
  id           TEXT    PRIMARY KEY,
  project_id   TEXT    NOT NULL,
  account_id   TEXT    NOT NULL,
  state        TEXT    NOT NULL DEFAULT 'open',
  opened_at    INTEGER NOT NULL,
  heartbeat_at INTEGER NOT NULL,
  closed_at    INTEGER,
  label        TEXT,
  pid          INTEGER
);
CREATE INDEX claims_open ON claims (account_id, state, project_id);

-- Every decision, kept. A gate nobody can audit after the fact is a gate
-- nobody trusts, and "why did it refuse at 03:00" is the question that gets
-- asked about an autonomous fleet.
CREATE TABLE decisions (
  id         TEXT    PRIMARY KEY,
  ts         INTEGER NOT NULL,
  project_id TEXT    NOT NULL,
  account_id TEXT    NOT NULL,
  verdict    TEXT    NOT NULL,
  policy     TEXT    NOT NULL,
  summary    TEXT    NOT NULL,
  payload    TEXT    NOT NULL   -- JSON: the full Decision
);
CREATE INDEX decisions_ts ON decisions (ts DESC);
CREATE INDEX decisions_pair ON decisions (project_id, account_id, ts DESC);
