import { Hono } from "hono";
import { env } from "../../core/env";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { validateAgentToken } from "./agent-token.service";

export const agentAuthRoutes = new Hono();

// POST /v1/auth/agent-login
agentAuthRoutes.post("/", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));

  const { token } = body;
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Agent token is required.");
  }

  const agent = await validateAgentToken(token);

  return c.json(
    toSuccessResponse(
      {
        valid: true,
        user: {
          id: agent.userId,
          email: agent.userEmail,
        },
        tokenName: agent.tokenName,
        gatewayUrl: env.GATEWAY_PUBLIC_BASE_URL,
        gatewayWsUrl: env.GATEWAY_WS_URL,
      },
      requestId,
    ),
    200,
  );
});
