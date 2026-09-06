import { Database } from "bun:sqlite";
import { env } from "../src/core/env";

const db = new Database(env.DATABASE_URL);

console.log("Seeding Tunnix database at:", env.DATABASE_URL);

// 1. Insert allowed email domain
db.query(
  "INSERT OR IGNORE INTO allowed_email_domains (id, domain, created_by_user_id) VALUES (?, ?, ?)",
).run("domain-tunnix-local", "tunnix.local", "system");

// 2. Insert admin user
db.query(
  `INSERT OR REPLACE INTO users (
    id, email, role, status, name, max_tunnels, max_subdomains,
    allowed_platforms, email_verified_at, approved_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`,
).run(
  "user-admin-seed-01",
  "admin@tunnix.local",
  "admin",
  "active",
  "Admin User",
  20,
  20,
  "windows,linux,mac,mac-intel",
);

// 3. Insert standard user
db.query(
  `INSERT OR REPLACE INTO users (
    id, email, role, status, name, max_tunnels, max_subdomains,
    allowed_platforms, email_verified_at, approved_at, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'), datetime('now'))`,
).run(
  "user-user-seed-02",
  "user@tunnix.local",
  "user",
  "active",
  "Standard User",
  5,
  5,
  "windows,linux,mac,mac-intel",
);

console.log("Seeding complete. Current users:");
const users = db.query("SELECT id, email, role, status FROM users").all();
console.log(JSON.stringify(users, null, 2));
