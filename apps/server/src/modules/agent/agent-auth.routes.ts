import { Hono } from "hono";
import { env } from "../../core/env";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { validateAgentToken } from "./agent-token.service";
import { writeAuditLog } from "../audit/audit.service";
import { getDb } from "../../core/db/db";

export const agentAuthRoutes = new Hono();

// POST /v1/auth/agent-login
// Called by the agent CLI to authenticate with a raw agent token.
// Returns user details + gateway connection info for the agent to proceed with tunnel grant.
agentAuthRoutes.post("/", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const { token } = body;
  if (!token || typeof token !== "string" || token.length < 16) {
    throw new ApiError(400, "INVALID_INPUT", "Agent token is required (minimum 16 characters).");
  }

  const agent = await validateAgentToken(token);

  // Fetch user role for the response
  const db = getDb();
  const userRow = db
    .query<{ role: string }, [string]>("SELECT role FROM users WHERE id = ? LIMIT 1")
    .get(agent.userId);

  writeAuditLog({
    actorUserId: agent.userId,
    action: "agent_authenticated",
    entityType: "agent_token",
    entityId: agent.tokenId,
    ipAddress: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: {
      tokenName: agent.tokenName,
      email: agent.userEmail,
    },
  });

  return c.json(
    toSuccessResponse(
      {
        user: {
          id: agent.userId,
          email: agent.userEmail,
          role: userRow?.role ?? "user",
        },
        tokenName: agent.tokenName,
        gatewayWsUrl: env.GATEWAY_WS_URL,
        wildcardBaseDomain: env.WILDCARD_BASE_DOMAIN,
      },
      requestId,
    ),
    200,
  );
});
