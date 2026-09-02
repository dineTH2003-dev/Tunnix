import { Hono } from "hono";
import { ApiError } from "../../core/errors";
import { toSuccessResponse } from "../../core/errors";
import { authMiddleware, activeUserGuard, adminGuard } from "../../middleware/auth";
import { writeAuditLog } from "../audit/audit.service";
import { getDb } from "../../core/db/db";
import {
  getAdminStats,
  listAdminUsers,
  getAdminUserRecord,
  getAdminUserDetail,
  updateUserStatus,
  updateUserRole,
  updateUserLimits,
  listAdminTunnels,
  listAdminSubdomains,
  listAdminBlockedSubdomains,
  adminBlockSubdomain,
  adminUnblockSubdomain,
  adminReleaseSubdomain,
  adminRevokeAgentToken,
  adminRevokeAllAgentTokensForUser,
  listAdminAuditLogs,
} from "./admin.service";
import {
  getAuthSecuritySettings,
  updateAuthSecuritySettings,
  listAllowedEmailDomains,
  createAllowedEmailDomain,
  deleteAllowedEmailDomain,
} from "../auth/auth-access.service";

/** Admin-level revoke — bypasses user ownership check */
function adminRevokeTunnelSession(sessionId: string): { updated: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query(
      `UPDATE tunnel_sessions SET status = 'revoked', disconnected_at = ?, updated_at = ?
       WHERE id = ? AND status IN ('pending', 'active')`,
    )
    .run(now, now, sessionId) as { changes?: number };
  return { updated: (result.changes ?? 0) === 1 };
}

export const adminRoutes = new Hono();

// All admin routes require auth + active status + admin role
adminRoutes.use("*", authMiddleware, activeUserGuard, adminGuard);


// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

adminRoutes.get("/stats", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse(getAdminStats(), requestId));
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

adminRoutes.get("/users", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse({ users: listAdminUsers() }, requestId));
});

adminRoutes.get("/users/:id", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const userId = c.req.param("id");
  const detail = getAdminUserDetail(userId);
  if (!detail) throw new ApiError(404, "NOT_FOUND", "User not found.");
  return c.json(toSuccessResponse(detail, requestId));
});

adminRoutes.patch("/users/:id/status", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const targetId = c.req.param("id");

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const status = body?.status;
  if (!["pending", "active", "suspended"].includes(status)) {
    throw new ApiError(400, "VALIDATION_ERROR", "status must be one of: pending, active, suspended.");
  }

  const target = getAdminUserRecord(targetId);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");

  if (actorUserId === targetId && status !== "active") {
    throw new ApiError(403, "FORBIDDEN", "You cannot suspend your own account.");
  }

  const result = updateUserStatus(targetId, status);
  if (!result.updated) throw new ApiError(404, "NOT_FOUND", "User not found.");

  writeAuditLog({
    actorUserId,
    action: "admin_user_status_updated",
    entityType: "user",
    entityId: targetId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { previousStatus: target.status, newStatus: status, targetEmail: target.email },
  });

  return c.json(toSuccessResponse({ id: targetId, status }, requestId));
});

adminRoutes.patch("/users/:id/role", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const targetId = c.req.param("id");

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const role = body?.role;
  if (!["user", "admin"].includes(role)) {
    throw new ApiError(400, "VALIDATION_ERROR", "role must be one of: user, admin.");
  }

  const target = getAdminUserRecord(targetId);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");

  if (actorUserId === targetId && role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "You cannot remove your own admin role.");
  }

  const result = updateUserRole(targetId, role);
  if (!result.updated) throw new ApiError(404, "NOT_FOUND", "User not found.");

  writeAuditLog({
    actorUserId,
    action: "admin_user_role_updated",
    entityType: "user",
    entityId: targetId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { previousRole: target.role, newRole: role, targetEmail: target.email },
  });

  return c.json(toSuccessResponse({ id: targetId, role }, requestId));
});

adminRoutes.patch("/users/:id/limits", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const targetId = c.req.param("id");

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const { maxTunnels, maxSubdomains, allowedPlatforms } = body ?? {};

  if (
    typeof maxTunnels !== "number" ||
    typeof maxSubdomains !== "number" ||
    !Array.isArray(allowedPlatforms) ||
    allowedPlatforms.length === 0
  ) {
    throw new ApiError(400, "VALIDATION_ERROR", "maxTunnels, maxSubdomains, and allowedPlatforms[] are required.");
  }

  const validPlatforms = ["windows", "linux", "mac", "mac-intel"];
  const invalid = allowedPlatforms.filter((p: unknown) => !validPlatforms.includes(p as string));
  if (invalid.length > 0) {
    throw new ApiError(400, "VALIDATION_ERROR", `Invalid platforms: ${invalid.join(", ")}`);
  }

  const target = getAdminUserRecord(targetId);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");

  const result = updateUserLimits({ userId: targetId, maxTunnels, maxSubdomains, allowedPlatforms });
  if (!result.updated) throw new ApiError(404, "NOT_FOUND", "User not found.");

  writeAuditLog({
    actorUserId,
    action: "admin_user_limits_updated",
    entityType: "user",
    entityId: targetId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { targetEmail: target.email, maxTunnels, maxSubdomains, allowedPlatforms },
  });

  return c.json(toSuccessResponse({ id: targetId, maxTunnels, maxSubdomains, allowedPlatforms }, requestId));
});

adminRoutes.post("/users/:id/revoke-agent-tokens", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const targetId = c.req.param("id");

  const target = getAdminUserRecord(targetId);
  if (!target) throw new ApiError(404, "NOT_FOUND", "User not found.");

  const result = adminRevokeAllAgentTokensForUser(targetId);

  writeAuditLog({
    actorUserId,
    action: "admin_agent_tokens_revoked_for_user",
    entityType: "user",
    entityId: targetId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { targetEmail: target.email, revokedCount: result.revokedCount },
  });

  return c.json(toSuccessResponse({ revokedCount: result.revokedCount }, requestId));
});

// ---------------------------------------------------------------------------
// Tunnels
// ---------------------------------------------------------------------------

adminRoutes.get("/tunnels", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const status = c.req.query("status");
  return c.json(toSuccessResponse(listAdminTunnels({ status }), requestId));
});

adminRoutes.post("/tunnels/:id/revoke", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const sessionId = c.req.param("id");

  const db = getDb();
  const tunnel = db
    .query<{ id: string; user_id: string; subdomain: string; status: string }, [string]>(
      "SELECT id, user_id, subdomain, status FROM tunnel_sessions WHERE id = ? LIMIT 1",
    )
    .get(sessionId);

  if (!tunnel) throw new ApiError(404, "NOT_FOUND", "Tunnel session not found.");

  const result = adminRevokeTunnelSession(sessionId);
  if (!result.updated) throw new ApiError(404, "NOT_FOUND", "Tunnel session not found or already inactive.");

  writeAuditLog({
    actorUserId,
    action: "admin_tunnel_revoked",
    entityType: "tunnel_session",
    entityId: sessionId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { ownerUserId: tunnel.user_id, subdomain: tunnel.subdomain, previousStatus: tunnel.status },
  });

  return c.json(toSuccessResponse({ revoked: true }, requestId));
});

// ---------------------------------------------------------------------------
// Agent Tokens (Admin)
// ---------------------------------------------------------------------------

adminRoutes.delete("/agent-tokens/:id", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const tokenId = c.req.param("id");

  const db = getDb();
  const token = db
    .query<{ id: string; user_id: string; name: string; revoked_at: string | null }, [string]>(
      "SELECT id, user_id, name, revoked_at FROM agent_tokens WHERE id = ? LIMIT 1",
    )
    .get(tokenId);

  if (!token) throw new ApiError(404, "NOT_FOUND", "Agent token not found.");

  if (token.revoked_at) {
    return c.json(toSuccessResponse({ revoked: false, alreadyRevoked: true }, requestId));
  }

  const result = adminRevokeAgentToken(tokenId);

  writeAuditLog({
    actorUserId,
    action: "admin_agent_token_revoked",
    entityType: "agent_token",
    entityId: tokenId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { ownerUserId: token.user_id, tokenName: token.name },
  });

  return c.json(toSuccessResponse({ revoked: result.revoked }, requestId));
});

// ---------------------------------------------------------------------------
// Subdomains (Admin)
// ---------------------------------------------------------------------------

adminRoutes.get("/subdomains", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse({ subdomains: listAdminSubdomains() }, requestId));
});

adminRoutes.delete("/subdomains/:id", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const id = c.req.param("id");

  const db = getDb();
  const sub = db
    .query<{ id: string; subdomain: string; user_id: string | null }, [string]>(
      "SELECT id, subdomain, user_id FROM reserved_subdomains WHERE id = ? LIMIT 1",
    )
    .get(id);

  if (!sub) throw new ApiError(404, "NOT_FOUND", "Subdomain reservation not found.");

  const result = adminReleaseSubdomain(id);
  if (!result.released) throw new ApiError(404, "NOT_FOUND", "Subdomain not found or already released.");

  writeAuditLog({
    actorUserId,
    action: "admin_subdomain_released",
    entityType: "reserved_subdomain",
    entityId: id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { subdomain: sub.subdomain, ownerUserId: sub.user_id },
  });

  return c.json(toSuccessResponse({ released: true }, requestId));
});

// ---------------------------------------------------------------------------
// Blocked Subdomains
// ---------------------------------------------------------------------------

adminRoutes.get("/blocked-subdomains", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse({ blocked: listAdminBlockedSubdomains() }, requestId));
});

adminRoutes.post("/blocked-subdomains", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const subdomain = body?.subdomain?.trim()?.toLowerCase();
  if (!subdomain || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid subdomain format.");
  }

  let result: { id: string; releasedReservations: number; revokedTunnels: number };
  try {
    result = adminBlockSubdomain({ subdomain, reason: body?.reason, blockedByUserId: actorUserId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("ALREADY_BLOCKED:")) {
      throw new ApiError(409, "CONFLICT", msg.split(":")[1]);
    }
    throw err;
  }

  writeAuditLog({
    actorUserId,
    action: "admin_subdomain_blocked",
    entityType: "blocked_subdomain",
    entityId: result.id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { subdomain, reason: body?.reason ?? null, releasedReservations: result.releasedReservations, revokedTunnels: result.revokedTunnels },
  });

  return c.json(toSuccessResponse(result, requestId), 201);
});

adminRoutes.delete("/blocked-subdomains/:id", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const id = c.req.param("id");

  const db = getDb();
  const row = db
    .query<{ id: string; subdomain: string }, [string]>(
      "SELECT id, subdomain FROM blocked_subdomains WHERE id = ? LIMIT 1",
    )
    .get(id);

  if (!row) throw new ApiError(404, "NOT_FOUND", "Blocked subdomain not found.");

  const result = adminUnblockSubdomain(id);
  if (!result.unblocked) throw new ApiError(404, "NOT_FOUND", "Blocked subdomain not found.");

  writeAuditLog({
    actorUserId,
    action: "admin_subdomain_unblocked",
    entityType: "blocked_subdomain",
    entityId: id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { subdomain: row.subdomain },
  });

  return c.json(toSuccessResponse({ unblocked: true }, requestId));
});

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

adminRoutes.get("/audit-logs", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const limitRaw = c.req.query("limit");
  const cursorRaw = c.req.query("cursor");
  const limit = limitRaw ? Number(limitRaw) : undefined;

  let cursorCreatedAt: string | undefined;
  let cursorId: string | undefined;

  if (cursorRaw) {
    const [createdAtPart, idPart] = cursorRaw.split("::");
    if (!createdAtPart || !idPart) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid cursor format.");
    }
    cursorCreatedAt = decodeURIComponent(createdAtPart);
    cursorId = decodeURIComponent(idPart);
  }

  const result = listAdminAuditLogs({
    limit: Number.isFinite(limit) ? limit : undefined,
    cursorCreatedAt,
    cursorId,
  });

  return c.json(toSuccessResponse(result, requestId));
});

// ---------------------------------------------------------------------------
// Auth Settings
// ---------------------------------------------------------------------------

adminRoutes.get("/auth-settings", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse(getAuthSecuritySettings(), requestId));
});

adminRoutes.patch("/auth-settings", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const updated = updateAuthSecuritySettings(actorUserId, body);

  writeAuditLog({
    actorUserId,
    action: "admin_auth_settings_updated",
    entityType: "auth_settings",
    entityId: "auth_settings",
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: body,
  });

  return c.json(toSuccessResponse(updated, requestId));
});

// ---------------------------------------------------------------------------
// Allowed Email Domains
// ---------------------------------------------------------------------------

adminRoutes.get("/allowed-email-domains", (c) => {
  const requestId = c.get("requestId" as never) as string;
  return c.json(toSuccessResponse({ domains: listAllowedEmailDomains() }, requestId));
});

adminRoutes.post("/allowed-email-domains", async (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const domain = body?.domain?.trim()?.toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid email domain format.");
  }

  let result: { id: string; domain: string; activatedUsers: number };
  try {
    result = createAllowedEmailDomain({ domain, actorUserId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("DOMAIN_EXISTS:")) {
      throw new ApiError(409, "CONFLICT", msg.split(":")[1]);
    }
    throw err;
  }

  writeAuditLog({
    actorUserId,
    action: "admin_allowed_email_domain_created",
    entityType: "allowed_email_domain",
    entityId: result.id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { domain: result.domain, activatedUsers: result.activatedUsers },
  });

  return c.json(toSuccessResponse(result, requestId), 201);
});

adminRoutes.delete("/allowed-email-domains/:id", (c) => {
  const requestId = c.get("requestId" as never) as string;
  const actorUserId = c.get("userId" as never) as string;
  const id = c.req.param("id");

  const result = deleteAllowedEmailDomain(id);
  if (!result.deleted) throw new ApiError(404, "NOT_FOUND", "Allowed email domain not found.");

  writeAuditLog({
    actorUserId,
    action: "admin_allowed_email_domain_deleted",
    entityType: "allowed_email_domain",
    entityId: id,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { domain: result.domain },
  });

  return c.json(toSuccessResponse({ deleted: true }, requestId));
});
