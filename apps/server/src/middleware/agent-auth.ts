import type { MiddlewareHandler } from "hono";
import { ApiError } from "../core/errors";
import { validateAgentToken } from "../modules/agent/agent-token.service";

export type AgentAuthContext = {
  tokenId: string;
  userId: string;
  userEmail: string;
  tokenName: string;
};

/**
 * Reads Authorization: Bearer <agentToken> header and validates it.
 * Attaches agentAuth to Hono context for downstream handlers.
 */
export const requireAgentAuth = (): MiddlewareHandler => async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Bearer agent token required in Authorization header.");
  }

  const rawToken = authHeader.substring(7).trim();
  if (!rawToken) {
    throw new ApiError(401, "UNAUTHORIZED", "Bearer agent token required.");
  }

  const agent = await validateAgentToken(rawToken);

  c.set("agentTokenId" as never, agent.tokenId);
  c.set("userId" as never, agent.userId);
  c.set("userEmail" as never, agent.userEmail);

  await next();
};
