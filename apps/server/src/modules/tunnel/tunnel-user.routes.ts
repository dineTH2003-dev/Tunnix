import { Hono } from "hono";
import { activeUserGuard, authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
import {
  issueTunnelSession,
  listUserTunnelSessions,
  revokeTunnelSession,
} from "./tunnel-session.service";

export const tunnelUserRoutes = new Hono();

// POST /v1/tunnel/sessions (Called by agent CLI or Dashboard to request a tunnel)
tunnelUserRoutes.post("/", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));

  const { agentToken, requestedSubdomain, localPort } = body;

  if (!agentToken || typeof agentToken !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "agentToken string is required.");
  }

  const port = parseInt(localPort, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ApiError(400, "INVALID_INPUT", "Valid localPort (1-65535) is required.");
  }

  const clientIp = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "127.0.0.1";

  const session = await issueTunnelSession({
    agentToken,
    requestedSubdomain,
    localPort: port,
    clientIp,
  });

  return c.json(toSuccessResponse(session, requestId), 201);
});

// GET /v1/tunnel/sessions (List active tunnels for dashboard)
tunnelUserRoutes.get("/", authMiddleware, activeUserGuard, (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);

  const sessions = listUserTunnelSessions(userId);
  return c.json(toSuccessResponse(sessions, requestId), 200);
});

// POST /v1/tunnel/sessions/:id/disconnect (Disconnect tunnel from dashboard)
tunnelUserRoutes.post("/:id/disconnect", authMiddleware, activeUserGuard, (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);
  const sessionId = c.req.param("id");

  revokeTunnelSession(userId, sessionId);
  return c.json(toSuccessResponse({ disconnected: true, id: sessionId }, requestId), 200);
});
