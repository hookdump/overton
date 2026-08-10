/**
 * SQLite, via bun:sqlite. WAL, one file, no ORM.
 *
 * The database is the arbiter, not the daemon. `claims` has a uniqueness story
 * and every write is a transaction, so the CLI and the server run the same code
 * path against the same file and neither needs the other to be alive.
 */

import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export type DB = Database;

export function openDb(file: string): DB {
  const db = new Database(file, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  // Both surfaces write. Without this, a concurrent `overton ask` during a
  // meter tick fails with SQLITE_BUSY instead of waiting a few milliseconds.
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  return db;
}

/** In-memory database for tests. Same migrations, no file. */
export function openMemoryDb(): DB {
  const db = new Database(":memory:", { strict: true });
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: DB): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL
  )`);
  const applied = new Set(
    db.query<{ name: string }, []>("SELECT name FROM schema_migrations").all().map((r) => r.name),
  );
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // All-or-nothing: a half-applied migration is worse than none.
    db.transaction(() => {
      db.exec(sql);
      db.query("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
        file,
        Math.floor(Date.now() / 1000),
      );
    })();
  }
}

export function getKv(db: DB, key: string): string | null {
  return db.query<{ value: string }, [string]>("SELECT value FROM kv WHERE key = ?").get(key)?.value ?? null;
}

export function setKv(db: DB, key: string, value: string, now: number): void {
  db.query(
    "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).run(key, value, now);
}

/** Run `fn` in a transaction. Bun's `transaction` rolls back on throw. */
export function tx<T>(db: DB, fn: () => T): T {
  return db.transaction(fn)();
}
