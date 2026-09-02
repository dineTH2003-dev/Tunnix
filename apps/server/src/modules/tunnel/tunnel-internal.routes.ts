import { Hono } from "hono";
import { env } from "../../core/env";
import { toSuccessResponse, ApiError } from "../../core/errors";
import {
  introspectGrantJti,
  markTunnelConnected,
  markTunnelDisconnected,
  recordTunnelHeartbeat,
} from "./tunnel-session.service";

export const tunnelInternalRoutes = new Hono();

// Middleware: Verify gateway internal secret
tunnelInternalRoutes.use("*", async (c, next) => {
  const secret = c.req.header("x-gateway-secret");
  if (!secret || secret !== env.INTERNAL_GATEWAY_SECRET) {
    throw new ApiError(403, "FORBIDDEN", "Unauthorized internal gateway request.");
  }
  await next();
});

// GET /v1/internal/tunnel/grants/:jti/introspect
tunnelInternalRoutes.get("/grants/:jti/introspect", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const jti = c.req.param("jti");

  const result = introspectGrantJti(jti);
  return c.json(toSuccessResponse(result, requestId), 200);
});

// POST /v1/internal/tunnel/sessions/:id/connected
tunnelInternalRoutes.post("/sessions/:id/connected", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const sessionId = c.req.param("id");

  markTunnelConnected(sessionId);
  return c.json(toSuccessResponse({ updated: true, id: sessionId, status: "active" }, requestId), 200);
});

// POST /v1/internal/tunnel/sessions/:id/disconnected
tunnelInternalRoutes.post("/sessions/:id/disconnected", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const sessionId = c.req.param("id");

  markTunnelDisconnected(sessionId);
  return c.json(toSuccessResponse({ updated: true, id: sessionId, status: "disconnected" }, requestId), 200);
});

// POST /v1/internal/tunnel/sessions/:id/heartbeat
tunnelInternalRoutes.post("/sessions/:id/heartbeat", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const sessionId = c.req.param("id");

  recordTunnelHeartbeat(sessionId);
  return c.json(toSuccessResponse({ updated: true, id: sessionId }, requestId), 200);
});
