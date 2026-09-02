import { Hono } from "hono";
import { activeUserGuard, authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
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
  const body = await c.req.json().catch(() => ({}));

  const { name } = body;
  if (!name || typeof name !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Token name is required.");
  }

  const result = await createAgentToken(userId, name);
  return c.json(toSuccessResponse(result, requestId), 201);
});

// DELETE /v1/agent-tokens/:id
agentTokenRoutes.delete("/:id", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);
  const tokenId = c.req.param("id");

  revokeAgentToken(userId, tokenId);
  return c.json(toSuccessResponse({ revoked: true, id: tokenId }, requestId), 200);
});
