/**
 * Migration runner — reads SQL files from ./migrations/ in order,
 * tracks applied migrations in a _migrations table, applies new ones.
 *
 * Usage: bun run scripts/migrate.ts
 */

import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { env } from "../src/core/env";

const db = new Database(env.DATABASE_URL, { create: true });
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

// Create migrations tracking table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id         TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const migrationsDir = resolve(import.meta.dir, "../migrations");

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let applied = 0;

for (const file of files) {
  const already = db
    .query<{ id: string }, [string]>("SELECT id FROM _migrations WHERE id = ?")
    .get(file);

  if (already) {
    console.log(`  skip  ${file}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), "utf-8");

  try {
    db.exec(sql);
    db.query("INSERT INTO _migrations (id) VALUES (?)").run(file);
    console.log(`  apply ${file}`);
    applied++;
  } catch (err) {
    console.error(`  ERROR applying ${file}:`, err);
    process.exit(1);
  }
}

console.log(`\nMigrations done. ${applied} new migration(s) applied.`);
db.close();
