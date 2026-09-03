import { describe, expect, test, beforeEach } from "bun:test";
import { app } from "../src/app";
import { openDb } from "../src/core/db/db";
import { signAccessToken } from "../src/modules/auth/jwt.service";

let adminId = "";
let adminToken = "";
let userId = "";
let userToken = "";

beforeEach(async () => {
  const db = openDb();
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec("DELETE FROM audit_logs;");
  db.exec("DELETE FROM allowed_email_domains;");
  db.exec("DELETE FROM blocked_subdomains;");
  db.exec("DELETE FROM tunnel_sessions;");
  db.exec("DELETE FROM reserved_subdomains;");
  db.exec("DELETE FROM agent_tokens;");
  db.exec("DELETE FROM sessions;");
  db.exec("DELETE FROM users;");
  db.exec("PRAGMA foreign_keys = ON;");

  adminId = crypto.randomUUID();
  userId = crypto.randomUUID();

  db.query(
    "INSERT INTO users (id, email, role, status, name) VALUES (?, 'admin@tunnix.local', 'admin', 'active', 'Admin User')",
  ).run(adminId);

  db.query(
    "INSERT INTO users (id, email, role, status, name) VALUES (?, 'user@tunnix.local', 'user', 'active', 'Standard User')",
  ).run(userId);

  db.close();

  adminToken = await signAccessToken({
    sub: adminId,
    email: "admin@tunnix.local",
    role: "admin",
    status: "active",
    sid: crypto.randomUUID(),
  });

  userToken = await signAccessToken({
    sub: userId,
    email: "user@tunnix.local",
    role: "user",
    status: "active",
    sid: crypto.randomUUID(),
  });
});

describe("Admin API Endpoints", () => {
  test("GET /v1/admin/stats - returns platform stats for admin", async () => {
    const res = await app.request("/v1/admin/stats", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.totalUsers).toBe(2);
    expect(json.data.adminUsers).toBe(1);
  });

  test("GET /v1/admin/stats - rejects non-admin users", async () => {
    const res = await app.request("/v1/admin/stats", {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe("FORBIDDEN");
  });

  test("GET /v1/admin/users - lists users for admin", async () => {
    const res = await app.request("/v1/admin/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.users.length).toBe(2);
  });

  test("PATCH /v1/admin/users/:id/status - update user status", async () => {
    const res = await app.request(`/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "suspended" }),
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("suspended");
  });

  test("GET /v1/admin/auth-settings - fetch auth settings", async () => {
    const res = await app.request("/v1/admin/auth-settings", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.otpTtlSeconds).toBeGreaterThan(0);
  });
});
