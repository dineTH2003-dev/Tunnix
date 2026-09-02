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
  db.exec("DELETE FROM blocked_subdomains;");
  db.exec("DELETE FROM agent_tokens;");
  db.exec("DELETE FROM sessions;");
  db.exec("DELETE FROM users;");
  db.close();

  userId = crypto.randomUUID();
  const dbWrite = openDb();
  dbWrite
    .query(
      "INSERT INTO users (id, email, role, status, name, max_subdomains) VALUES (?, 'subdomain@tunnix.local', 'user', 'active', 'Subdomain Test', 2)",
    )
    .run(userId);

  // Add a blocked subdomain entry
  dbWrite
    .query("INSERT INTO blocked_subdomains (id, subdomain, reason) VALUES (?, 'admin', 'System reserved')")
    .run(crypto.randomUUID());

  dbWrite.close();

  userToken = await signAccessToken({
    sub: userId,
    email: "subdomain@tunnix.local",
    role: "user",
    status: "active",
    sid: crypto.randomUUID(),
  });
});

describe("Subdomains Module Tests", () => {
  test("POST /v1/subdomains - reserve valid subdomain", async () => {
    const res = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "my-app" }),
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.data.subdomain).toBe("my-app");
  });

  test("POST /v1/subdomains - reject invalid format", async () => {
    const res = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "-invalid-subdomain-" }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe("INVALID_SUBDOMAIN");
  });

  test("POST /v1/subdomains - reject blocked subdomain", async () => {
    const res = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "admin" }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe("SUBDOMAIN_BLOCKED");
  });

  test("POST /v1/subdomains - enforce max limit", async () => {
    // Max subdomains for test user is 2
    await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "app-one" }),
    });

    await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "app-two" }),
    });

    const res = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "app-three" }),
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error.code).toBe("SUBDOMAIN_LIMIT_REACHED");
  });

  test("DELETE /v1/subdomains/:id - release subdomain", async () => {
    const reserveRes = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "release-me" }),
    });
    const reserveJson = (await reserveRes.json()) as any;

    const delRes = await app.request(`/v1/subdomains/${reserveJson.data.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userToken}` },
    });

    expect(delRes.status).toBe(200);

    // Should now be able to re-reserve
    const reRes = await app.request("/v1/subdomains", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ subdomain: "release-me" }),
    });

    expect(reRes.status).toBe(201);
  });
});
