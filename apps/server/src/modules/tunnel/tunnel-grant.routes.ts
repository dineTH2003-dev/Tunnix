import { Hono } from "hono";
import { ApiError, toSuccessResponse } from "../../core/errors";
import { requireAgentAuth } from "../../middleware/agent-auth";
import { writeAuditLog } from "../audit/audit.service";
import { issueTunnelGrant } from "./tunnel-grant.service";

const tunnelGrantRoutes = new Hono();

// POST /v1/tunnel/grant
// Called by the agent CLI after agent-login to request a tunnel.
// Auth: Authorization: Bearer <agentToken>
// Body: { port: number, subdomain?: string }
// Response: { grantToken, sessionId, subdomain, publicUrl, localPublicUrl, gatewayWsUrl, expiresAt }
tunnelGrantRoutes.post("/grant", requireAgentAuth(), async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const agentTokenId = c.get("agentTokenId" as never) as string;
  const userId = c.get("userId" as never) as string;

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const port = Number(body?.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ApiError(400, "VALIDATION_ERROR", "port must be an integer between 1 and 65535.");
  }

  const requestedSubdomain = typeof body?.subdomain === "string" ? body.subdomain.trim() : undefined;

  const result = await issueTunnelGrant({
    userId,
    agentTokenId,
    port,
    requestedSubdomain: requestedSubdomain || undefined,
  });

  writeAuditLog({
    actorUserId: userId,
    action: "tunnel_grant_issued",
    entityType: "tunnel_session",
    entityId: result.sessionId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: {
      subdomain: result.subdomain,
      publicUrl: result.publicUrl,
      localPublicUrl: result.localPublicUrl,
      requestedSubdomain: requestedSubdomain ?? null,
      localPort: port,
      agentTokenId,
    },
  });

  return c.json(toSuccessResponse(result, requestId), 201);
});

export { tunnelGrantRoutes };
