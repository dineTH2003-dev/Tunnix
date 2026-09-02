import { getDb } from "../../core/db/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminStats = {
  totalUsers: number;
  adminUsers: number;
  pendingUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalSessions: number;
  activeTunnels: number;
  totalTokens: number;
  activeTokens: number;
  reservedSubdomains: number;
  totalAuditLogs: number;
  sessionsLast7Days: number;
  sessionsLast30Days: number;
};

export type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  email_verified_at: string | null;
  approved_at: string | null;
  created_at: string;
  max_tunnels: number;
  max_subdomains: number;
  allowed_platforms: string;
  request_source: string | null;
  requested_subdomain: string | null;
  request_submitted_at: string | null;
  active_tunnels: number;
  token_count: number;
  subdomain_count: number;
};

export type AdminUserDetailRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  email_verified_at: string | null;
  approved_at: string | null;
  created_at: string;
  max_tunnels: number;
  max_subdomains: number;
  allowed_platforms: string;
  request_source: string | null;
  requested_subdomain: string | null;
  request_submitted_at: string | null;
};

export type AdminTunnelListItem = {
  id: string;
  user_id: string;
  user_email: string;
  user_role: string;
  subdomain: string;
  target_url: string;
  public_url: string | null;
  local_port: number | null;
  status: string;
  connected_at: string | null;
  disconnected_at: string | null;
  last_heartbeat_at: string | null;
  client_ip: string | null;
  created_at: string;
};

export type AdminSubdomainListItem = {
  id: string;
  subdomain: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  user_email: string | null;
};

export type AdminBlockedSubdomainListItem = {
  id: string;
  subdomain: string;
  reason: string | null;
  blocked_by_user_id: string | null;
  blocked_by_user_email: string | null;
  created_at: string;
};

export type AdminAuditLogItem = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: string | null;
  created_at: string;
  actor_user_id: string | null;
  actor_user_email: string | null;
};

export type AdminAuditLogResult = {
  items: AdminAuditLogItem[];
  nextCursor: string | null;
};

export type AdminUserDetail = {
  user: AdminUserDetailRecord;
  summary: {
    tokens: number;
    active_tokens: number;
    sessions: number;
    reserved: number;
    audit_logs: number;
  };
  tokens: Array<{
    id: string;
    name: string;
    token_prefix: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>;
  sessions: Array<{
    id: string;
    subdomain: string;
    local_port: number | null;
    status: string;
    connected_at: string | null;
    disconnected_at: string | null;
    duration_seconds: number | null;
    client_ip: string | null;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    ip_address: string | null;
    created_at: string;
  }>;
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getCount(query: string, ...params: Array<string | number>): number {
  const db = getDb();
  const row = db.query<{ count: number }, Array<string | number>>(query).get(...params);
  return row?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getAdminStats(): AdminStats {
  return {
    totalUsers: getCount("SELECT COUNT(*) AS count FROM users"),
    adminUsers: getCount("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'"),
    pendingUsers: getCount("SELECT COUNT(*) AS count FROM users WHERE status = 'pending'"),
    activeUsers: getCount("SELECT COUNT(*) AS count FROM users WHERE status = 'active'"),
    suspendedUsers: getCount("SELECT COUNT(*) AS count FROM users WHERE status = 'suspended'"),
    totalSessions: getCount("SELECT COUNT(*) AS count FROM tunnel_sessions"),
    activeTunnels: getCount("SELECT COUNT(*) AS count FROM tunnel_sessions WHERE status IN ('pending', 'active')"),
    totalTokens: getCount("SELECT COUNT(*) AS count FROM agent_tokens"),
    activeTokens: getCount("SELECT COUNT(*) AS count FROM agent_tokens WHERE revoked_at IS NULL"),
    reservedSubdomains: getCount("SELECT COUNT(*) AS count FROM reserved_subdomains WHERE status = 'active'"),
    totalAuditLogs: getCount("SELECT COUNT(*) AS count FROM audit_logs"),
    sessionsLast7Days: getCount(
      "SELECT COUNT(*) AS count FROM tunnel_sessions WHERE datetime(created_at) >= datetime('now', '-7 days')",
    ),
    sessionsLast30Days: getCount(
      "SELECT COUNT(*) AS count FROM tunnel_sessions WHERE datetime(created_at) >= datetime('now', '-30 days')",
    ),
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function listAdminUsers(): AdminUserListItem[] {
  const db = getDb();
  return db
    .query<AdminUserListItem, []>(
      `SELECT
         users.id, users.name, users.email, users.role, users.status,
         users.email_verified_at, users.approved_at, users.created_at,
         users.max_tunnels, users.max_subdomains, users.allowed_platforms,
         users.request_source, users.requested_subdomain, users.request_submitted_at,
         (SELECT COUNT(*) FROM tunnel_sessions
          WHERE tunnel_sessions.user_id = users.id
            AND tunnel_sessions.status IN ('pending', 'active')) AS active_tunnels,
         (SELECT COUNT(*) FROM agent_tokens
          WHERE agent_tokens.user_id = users.id
            AND agent_tokens.revoked_at IS NULL) AS token_count,
         (SELECT COUNT(*) FROM reserved_subdomains
          WHERE reserved_subdomains.user_id = users.id
            AND reserved_subdomains.status = 'active') AS subdomain_count
       FROM users
       ORDER BY users.created_at DESC`,
    )
    .all();
}

export function getAdminUserRecord(userId: string): AdminUserDetailRecord | null {
  const db = getDb();
  return (
    db
      .query<AdminUserDetailRecord, [string]>(
        `SELECT id, name, email, role, status, email_verified_at, approved_at, created_at,
                max_tunnels, max_subdomains, allowed_platforms,
                request_source, requested_subdomain, request_submitted_at
         FROM users WHERE id = ? LIMIT 1`,
      )
      .get(userId) ?? null
  );
}

export function getAdminUserDetail(userId: string): AdminUserDetail | null {
  const db = getDb();

  const user =
    db
      .query<AdminUserDetailRecord, [string]>(
        `SELECT id, name, email, role, status, email_verified_at, approved_at, created_at,
                max_tunnels, max_subdomains, allowed_platforms,
                request_source, requested_subdomain, request_submitted_at
         FROM users WHERE id = ? LIMIT 1`,
      )
      .get(userId) ?? null;

  if (!user) return null;

  const summary = {
    tokens: getCount("SELECT COUNT(*) AS count FROM agent_tokens WHERE user_id = ?", userId),
    active_tokens: getCount(
      "SELECT COUNT(*) AS count FROM agent_tokens WHERE user_id = ? AND revoked_at IS NULL",
      userId,
    ),
    sessions: getCount("SELECT COUNT(*) AS count FROM tunnel_sessions WHERE user_id = ?", userId),
    reserved: getCount(
      "SELECT COUNT(*) AS count FROM reserved_subdomains WHERE user_id = ? AND status = 'active'",
      userId,
    ),
    audit_logs: getCount("SELECT COUNT(*) AS count FROM audit_logs WHERE actor_user_id = ?", userId),
  };

  const tokens = db
    .query<AdminUserDetail["tokens"][number], [string]>(
      `SELECT id, name, token_prefix, created_at, last_used_at, revoked_at
       FROM agent_tokens WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId);

  const sessions = db
    .query<AdminUserDetail["sessions"][number], [string]>(
      `SELECT id, subdomain, local_port, status, connected_at, disconnected_at,
              CAST((julianday(COALESCE(disconnected_at, CURRENT_TIMESTAMP)) - julianday(connected_at)) * 86400 AS INTEGER) AS duration_seconds,
              client_ip
       FROM tunnel_sessions WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(userId);

  const auditLogs = db
    .query<AdminUserDetail["auditLogs"][number], [string]>(
      `SELECT id, action, ip_address, created_at
       FROM audit_logs WHERE actor_user_id = ? ORDER BY created_at DESC LIMIT 50`,
    )
    .all(userId);

  return { user, summary, tokens, sessions, auditLogs };
}

export function updateUserStatus(
  userId: string,
  status: "pending" | "active" | "suspended",
): { updated: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query(
      `UPDATE users
       SET status = ?,
           approved_at = CASE WHEN ? = 'active' THEN COALESCE(approved_at, ?) ELSE approved_at END,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(status, status, now, now, userId) as { changes?: number };
  return { updated: (result.changes ?? 0) === 1 };
}

export function updateUserRole(userId: string, role: "user" | "admin"): { updated: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
    .run(role, now, userId) as { changes?: number };
  return { updated: (result.changes ?? 0) === 1 };
}

export function updateUserLimits(input: {
  userId: string;
  maxTunnels: number;
  maxSubdomains: number;
  allowedPlatforms: string[];
}): { updated: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query(
      `UPDATE users
       SET max_tunnels = ?, max_subdomains = ?, allowed_platforms = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.maxTunnels,
      input.maxSubdomains,
      input.allowedPlatforms.join(","),
      now,
      input.userId,
    ) as { changes?: number };
  return { updated: (result.changes ?? 0) === 1 };
}

// ---------------------------------------------------------------------------
// Tunnels
// ---------------------------------------------------------------------------

export function listAdminTunnels(filters?: { status?: string }): {
  items: AdminTunnelListItem[];
  total: number;
} {
  const db = getDb();
  const conditions: string[] = [];
  const params: Array<string> = [];

  if (filters?.status) {
    const statuses = filters.status
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (statuses.length > 0) {
      conditions.push(`tunnel_sessions.status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const total = getCount(
    `SELECT COUNT(*) AS count FROM tunnel_sessions ${where}`,
    ...params,
  );

  const items = db
    .query<AdminTunnelListItem, string[]>(
      `SELECT
         tunnel_sessions.id, tunnel_sessions.user_id,
         users.email AS user_email, users.role AS user_role,
         tunnel_sessions.subdomain, tunnel_sessions.target_url, tunnel_sessions.public_url,
         tunnel_sessions.local_port, tunnel_sessions.status,
         tunnel_sessions.connected_at, tunnel_sessions.disconnected_at,
         tunnel_sessions.last_heartbeat_at, tunnel_sessions.client_ip,
         tunnel_sessions.created_at
       FROM tunnel_sessions
       INNER JOIN users ON users.id = tunnel_sessions.user_id
       ${where}
       ORDER BY tunnel_sessions.created_at DESC`,
    )
    .all(...params);

  return { items, total };
}

// ---------------------------------------------------------------------------
// Subdomains
// ---------------------------------------------------------------------------

export function listAdminSubdomains(): AdminSubdomainListItem[] {
  const db = getDb();
  return db
    .query<AdminSubdomainListItem, []>(
      `SELECT
         reserved_subdomains.id, reserved_subdomains.subdomain,
         reserved_subdomains.status, reserved_subdomains.created_at, reserved_subdomains.updated_at,
         reserved_subdomains.user_id, users.email AS user_email
       FROM reserved_subdomains
       LEFT JOIN users ON users.id = reserved_subdomains.user_id
       ORDER BY reserved_subdomains.created_at DESC`,
    )
    .all();
}

export function listAdminBlockedSubdomains(): AdminBlockedSubdomainListItem[] {
  const db = getDb();
  return db
    .query<AdminBlockedSubdomainListItem, []>(
      `SELECT
         blocked_subdomains.id, blocked_subdomains.subdomain, blocked_subdomains.reason,
         blocked_subdomains.blocked_by_user_id,
         users.email AS blocked_by_user_email,
         blocked_subdomains.created_at
       FROM blocked_subdomains
       LEFT JOIN users ON users.id = blocked_subdomains.blocked_by_user_id
       ORDER BY blocked_subdomains.created_at DESC`,
    )
    .all();
}

export function adminBlockSubdomain(input: {
  subdomain: string;
  reason?: string;
  blockedByUserId: string;
}): { id: string; releasedReservations: number; revokedTunnels: number } {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .query<{ id: string }, [string]>("SELECT id FROM blocked_subdomains WHERE subdomain = ? LIMIT 1")
    .get(input.subdomain);

  if (existing) {
    throw new Error("ALREADY_BLOCKED:This subdomain is already blocked.");
  }

  const id = crypto.randomUUID();

  db.exec("BEGIN");
  try {
    db.query(
      `INSERT INTO blocked_subdomains (id, subdomain, reason, blocked_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.subdomain, input.reason ?? null, input.blockedByUserId, now, now);

    // Release all active reservations for this subdomain
    const released = db
      .query(
        `UPDATE reserved_subdomains SET status = 'released', updated_at = ?
         WHERE subdomain = ? AND status = 'active'`,
      )
      .run(now, input.subdomain) as { changes?: number };

    // Revoke any active tunnel sessions
    const revoked = db
      .query(
        `UPDATE tunnel_sessions SET status = 'revoked', disconnected_at = ?, updated_at = ?
         WHERE subdomain = ? AND status IN ('pending', 'active')`,
      )
      .run(now, now, input.subdomain) as { changes?: number };

    db.exec("COMMIT");
    return {
      id,
      releasedReservations: released.changes ?? 0,
      revokedTunnels: revoked.changes ?? 0,
    };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function adminUnblockSubdomain(id: string): { unblocked: boolean } {
  const db = getDb();
  const result = db
    .query("DELETE FROM blocked_subdomains WHERE id = ?")
    .run(id) as { changes?: number };
  return { unblocked: (result.changes ?? 0) === 1 };
}

export function adminReleaseSubdomain(id: string): { released: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query(
      "UPDATE reserved_subdomains SET status = 'released', updated_at = ? WHERE id = ? AND status = 'active'",
    )
    .run(now, id) as { changes?: number };
  return { released: (result.changes ?? 0) === 1 };
}

// ---------------------------------------------------------------------------
// Agent Tokens
// ---------------------------------------------------------------------------

export function adminRevokeAgentToken(tokenId: string): { revoked: boolean } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query("UPDATE agent_tokens SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL")
    .run(now, tokenId) as { changes?: number };
  return { revoked: (result.changes ?? 0) === 1 };
}

export function adminRevokeAllAgentTokensForUser(userId: string): { revokedCount: number } {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .query("UPDATE agent_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL")
    .run(now, userId) as { changes?: number };
  return { revokedCount: result.changes ?? 0 };
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export function listAdminAuditLogs(input?: {
  cursorCreatedAt?: string;
  cursorId?: string;
  limit?: number;
}): AdminAuditLogResult {
  const db = getDb();
  const limit = Math.min(Math.max(input?.limit ?? 50, 1), 100);
  const params: string[] = [];
  let where = "";

  if (input?.cursorCreatedAt && input?.cursorId) {
    where = `WHERE (audit_logs.created_at < ? OR (audit_logs.created_at = ? AND audit_logs.id < ?))`;
    params.push(input.cursorCreatedAt, input.cursorCreatedAt, input.cursorId);
  }

  const items = db
    .query<AdminAuditLogItem, string[]>(
      `SELECT
         audit_logs.id, audit_logs.action, audit_logs.entity_type, audit_logs.entity_id,
         audit_logs.ip_address, audit_logs.user_agent, audit_logs.metadata_json,
         audit_logs.created_at, audit_logs.actor_user_id,
         users.email AS actor_user_email
       FROM audit_logs
       LEFT JOIN users ON users.id = audit_logs.actor_user_id
       ${where}
       ORDER BY audit_logs.created_at DESC, audit_logs.id DESC
       LIMIT ?`,
    )
    .all(...params, String(limit + 1));

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems[pageItems.length - 1];

  return {
    items: pageItems,
    nextCursor:
      hasMore && last
        ? `${encodeURIComponent(last.created_at)}::${encodeURIComponent(last.id)}`
        : null,
  };
}
