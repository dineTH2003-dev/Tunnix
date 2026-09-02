import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { app } from "../src/app";
import { getDb } from "../src/core/db/db";

describe("Tunnix Platform Production Smoke Tests", () => {
  beforeAll(() => {
    try {
      const db = getDb();
      db.run("DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE email = 'smoketest@tunnix.local')");
      db.run("DELETE FROM otp_challenges WHERE email = 'smoketest@tunnix.local'");
      db.run("DELETE FROM users WHERE email = 'smoketest@tunnix.local'");
    } catch {
      // Ignore
    }
  });

  afterAll(() => {
    try {
      const db = getDb();
      db.run("DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE email = 'smoketest@tunnix.local')");
      db.run("DELETE FROM otp_challenges WHERE email = 'smoketest@tunnix.local'");
      db.run("DELETE FROM users WHERE email = 'smoketest@tunnix.local'");
    } catch {
      // Ignore
    }
  });

  it("GET / - root service info", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.service).toBe("tunnix");
  });

  it("GET /health - database ping health check", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.db).toBe("ok");
  });

  it("GET /v1/download/linux-amd64 - agent binary download endpoint", async () => {
    const res = await app.request("/v1/download/linux-amd64");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    expect(res.headers.get("content-disposition")).toContain("tunnix-linux-amd64");
  });

  it("POST /v1/auth/request-otp - send OTP for new user", async () => {
    const res = await app.request("/v1/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "smoketest@tunnix.local",
        turnstileToken: "dev-bypass",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.challengeId).toBeDefined();
  });
});
