import { describe, expect, test, beforeEach } from "bun:test";
import { app } from "../src/app";
import { openDb } from "../src/core/db/db";
import { env } from "../src/core/env";
import { signAccessToken } from "../src/modules/auth/jwt.service";
import { createAgentToken } from "../src/modules/agent/agent-token.service";
import { verifyTunnelGrant } from "../src/modules/tunnel/tunnel-grant.service";

let userId = "";
let userToken = "";
let rawAgentToken = "";

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
      "INSERT INTO users (id, email, role, status, name, max_tunnels) VALUES (?, 'tunneltest@tunnix.local', 'user', 'active', 'Tunnel Test', 2)",
    )
    .run(userId);
  dbWrite.close();

  userToken = await signAccessToken({
    sub: userId,
    email: "tunneltest@tunnix.local",
    role: "user",
    status: "active",
    sid: crypto.randomUUID(),
  });

  const created = await createAgentToken(userId, "test-agent");
  rawAgentToken = created.token;
});

describe("Tunnel Module Server Tests", () => {
  test("POST /v1/tunnel/sessions - issue tunnel session & grant token", async () => {
    const res = await app.request("/v1/tunnel/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentToken: rawAgentToken,
        localPort: 3000,
      }),
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.sessionId).toBeDefined();
    expect(json.data.grantToken).toBeDefined();
    expect(json.data.publicUrl).toContain(env.WILDCARD_BASE_DOMAIN);

    // Verify grant token signature & claims
    const verified = await verifyTunnelGrant(json.data.grantToken);
    expect(verified.uid).toBe(userId);
    expect(verified.prt).toBe(3000);
  });

  test("GET /v1/internal/tunnel/grants/:jti/introspect - gateway introspection", async () => {
    const issueRes = await app.request("/v1/tunnel/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentToken: rawAgentToken,
        requestedSubdomain: "custom-sub",
        localPort: 8080,
      }),
    });
    const issueJson = (await issueRes.json()) as any;
    const grant = await verifyTunnelGrant(issueJson.data.grantToken);

    // Call internal introspection endpoint with secret header
    const introRes = await app.request(`/v1/internal/tunnel/grants/${grant.jti}/introspect`, {
      headers: { "x-gateway-secret": env.INTERNAL_GATEWAY_SECRET },
    });

    expect(introRes.status).toBe(200);
    const introJson = (await introRes.json()) as any;
    expect(introJson.data.valid).toBe(true);
    expect(introJson.data.subdomain).toBe("custom-sub");
  });

  test("POST /v1/internal/tunnel/sessions/:id/connected - gateway lifecycle callback", async () => {
    const issueRes = await app.request("/v1/tunnel/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentToken: rawAgentToken,
        localPort: 5000,
      }),
    });
    const issueJson = (await issueRes.json()) as any;
    const sessionId = issueJson.data.sessionId;

    const connRes = await app.request(`/v1/internal/tunnel/sessions/${sessionId}/connected`, {
      method: "POST",
      headers: { "x-gateway-secret": env.INTERNAL_GATEWAY_SECRET },
    });

    expect(connRes.status).toBe(200);
    const connJson = (await connRes.json()) as any;
    expect(connJson.data.status).toBe("active");
  });
});
