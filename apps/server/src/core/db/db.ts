import { Database } from "bun:sqlite";
import { env } from "../env";
import { logInfo } from "../logging";

let _db: Database | null = null;

/**
 * Returns the singleton SQLite database instance.
 * Enables WAL mode for concurrent reads.
 */
export function getDb(): Database {
  if (!_db) {
    _db = new Database(env.DATABASE_URL, { create: true });
    _db.exec("PRAGMA journal_mode=WAL;");
    _db.exec("PRAGMA foreign_keys=ON;");
    logInfo("db", "Database opened", { path: env.DATABASE_URL });
  }
  return _db;
}

/**
 * Opens a fresh database connection.
 * Use for one-off operations outside the singleton lifecycle.
 */
export function openDb(): Database {
  const db = new Database(env.DATABASE_URL, { create: true });
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("PRAGMA foreign_keys=ON;");
  return db;
}
