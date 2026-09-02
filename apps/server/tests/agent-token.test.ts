import { describe, expect, test, beforeEach } from "bun:test";
import { app } from "../src/app";
import { openDb } from "../src/core/db/db";
import { signAccessToken } from "../src/modules/auth/jwt.service";

let userId = "";
let userToken = "";

beforeEach(async () => {
  const db = openDb();
  db.exec("DELETE FROM tunnel_sessions;");
  db.exec("DELETE FROM reserved_subdomains;");
  db.exec("DELETE FROM agent_tokens;");
  db.exec("DELETE FROM sessions;");
  db.exec("DELETE FROM users;");
  db.close();

  userId = crypto.randomUUID();
  const dbWrite = openDb();
  dbWrite
    .query(
      "INSERT INTO users (id, email, role, status, name) VALUES (?, 'agenttest@tunnix.local', 'user', 'active', 'Agent Test')",
    )
    .run(userId);
  dbWrite.close();

  userToken = await signAccessToken({
    sub: userId,
    email: "agenttest@tunnix.local",
    role: "user",
    status: "active",
    sid: crypto.randomUUID(),
  });
});

describe("Agent Tokens Module Tests", () => {
  let createdRawToken = "";
  let createdTokenId = "";

  test("POST /v1/agent-tokens - create agent token", async () => {
    const res = await app.request("/v1/agent-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "laptop-cli" }),
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.token).toContain("tunnix_");
    expect(json.data.name).toBe("laptop-cli");

    createdRawToken = json.data.token;
    createdTokenId = json.data.id;
  });

  test("GET /v1/agent-tokens - list user agent tokens", async () => {
    // Create one token first
    await app.request("/v1/agent-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "desktop-cli" }),
    });

    const res = await app.request("/v1/agent-tokens", {
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
    expect(json.data[0].name).toBe("desktop-cli");
    expect(json.data[0].tokenPrefix).toBeDefined();
    // Raw token must NEVER be returned in list
    expect(json.data[0].token).toBeUndefined();
  });

  test("POST /v1/auth/agent-login - CLI agent login with raw token", async () => {
    const createRes = await app.request("/v1/agent-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "cli-login-test" }),
    });
    const createJson = (await createRes.json()) as any;
    const rawToken = createJson.data.token;

    const loginRes = await app.request("/v1/auth/agent-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken }),
    });

    expect(loginRes.status).toBe(200);
    const loginJson = (await loginRes.json()) as any;
    expect(loginJson.data.valid).toBe(true);
    expect(loginJson.data.user.id).toBe(userId);
    expect(loginJson.data.gatewayUrl).toBeDefined();
  });

  test("DELETE /v1/agent-tokens/:id - revoke agent token", async () => {
    const createRes = await app.request("/v1/agent-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ name: "to-revoke" }),
    });
    const createJson = (await createRes.json()) as any;

    const delRes = await app.request(`/v1/agent-tokens/${createJson.data.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(delRes.status).toBe(200);

    // Verify token can no longer be used for agent login
    const loginRes = await app.request("/v1/auth/agent-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: createJson.data.token }),
    });

    expect(loginRes.status).toBe(401);
  });
});
