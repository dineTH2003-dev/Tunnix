import { Hono } from "hono";
import { activeUserGuard, authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { writeAuditLog } from "../audit/audit.service";
import {
  createAgentToken,
  listAgentTokens,
  revokeAgentToken,
} from "./agent-token.service";

export const agentTokenRoutes = new Hono();

agentTokenRoutes.use("*", authMiddleware, activeUserGuard);

// GET /v1/agent-tokens
agentTokenRoutes.get("/", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);

  const tokens = listAgentTokens(userId);
  return c.json(toSuccessResponse(tokens, requestId), 200);
});

// POST /v1/agent-tokens
agentTokenRoutes.post("/", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 1 || name.length > 64) {
    throw new ApiError(400, "INVALID_INPUT", "Token name must be between 1 and 64 characters.");
  }

  const result = await createAgentToken(userId, name);

  writeAuditLog({
    actorUserId: userId,
    action: "agent_token_created",
    entityType: "agent_token",
    entityId: result.id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { tokenName: result.name, tokenPrefix: result.tokenPrefix },
  });

  return c.json(toSuccessResponse(result, requestId), 201);
});

// DELETE /v1/agent-tokens/:id
agentTokenRoutes.delete("/:id", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);
  const tokenId = c.req.param("id");

  revokeAgentToken(userId, tokenId);

  writeAuditLog({
    actorUserId: userId,
    action: "agent_token_revoked",
    entityType: "agent_token",
    entityId: tokenId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { revokedById: userId },
  });

  return c.json(toSuccessResponse({ revoked: true, id: tokenId }, requestId), 200);
});
