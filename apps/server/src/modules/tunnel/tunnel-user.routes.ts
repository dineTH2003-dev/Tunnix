import { Hono } from "hono";
import { activeUserGuard, authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { writeAuditLog } from "../audit/audit.service";
import {
  issueTunnelSession,
  listUserTunnelSessions,
  getUserTunnelStats,
  revokeTunnelSession,
  checkTunnelSessionHealth,
  checkTunnelSessionsHealth,
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

// GET /v1/tunnel/sessions (List sessions for dashboard - supports ?status=active,disconnected)
tunnelUserRoutes.get("/", authMiddleware, activeUserGuard, (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;
  const status = c.req.query("status");

  const result = listUserTunnelSessions(userId, { status });
  return c.json(toSuccessResponse(result, requestId), 200);
});

// GET /v1/tunnel/sessions/stats (Dashboard metric cards)
tunnelUserRoutes.get("/stats", authMiddleware, activeUserGuard, (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;

  const stats = getUserTunnelStats(userId);
  return c.json(toSuccessResponse(stats, requestId), 200);
});

// POST /v1/tunnel/sessions/:id/disconnect (Disconnect tunnel from dashboard)
tunnelUserRoutes.post("/:id/disconnect", authMiddleware, activeUserGuard, (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;
  const sessionId = c.req.param("id");

  revokeTunnelSession(userId, sessionId);

  writeAuditLog({
    actorUserId: userId,
    action: "tunnel_session_disconnected",
    entityType: "tunnel_session",
    entityId: sessionId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { initiatedBy: "user" },
  });

  return c.json(toSuccessResponse({ disconnected: true, id: sessionId }, requestId), 200);
});

// POST /v1/tunnel/sessions/:id/check (Check health of a single session)
tunnelUserRoutes.post("/:id/check", authMiddleware, activeUserGuard, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const sessionId = c.req.param("id");

  const result = await checkTunnelSessionHealth(sessionId);
  return c.json(toSuccessResponse(result, requestId), 200);
});

// POST /v1/tunnel/sessions/check-all (Bulk health check for active user sessions)
tunnelUserRoutes.post("/check-all", authMiddleware, activeUserGuard, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;

  const { items } = listUserTunnelSessions(userId, { status: "pending,active" });
  const sessionIds = items.map((s) => s.id);

  const result = await checkTunnelSessionsHealth(sessionIds);
  return c.json(toSuccessResponse(result, requestId), 200);
});
