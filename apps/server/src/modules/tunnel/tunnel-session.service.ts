import { getDb } from "../../core/db/db";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";
import { validateAgentToken } from "../agent/agent-token.service";
import { validateSubdomainFormat } from "../subdomain/subdomain.service";
import { signTunnelGrant } from "./tunnel-grant.service";

export type TunnelSessionRecord = {
  id: string;
  user_id: string;
  agent_token_id: string | null;
  subdomain: string;
  target_url: string;
  public_url: string | null;
  local_port: number | null;
  status: "pending" | "active" | "disconnected" | "revoked";
  grant_jti: string | null;
  grant_expires_at: string | null;
  client_ip: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Generate a random alphanumeric string for unassigned subdomains */
function generateRandomSubdomain(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < env.RANDOM_SUBDOMAIN_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Clean up stale tunnel sessions (active/pending sessions with no heartbeat for > 2 min).
 */
export function cleanupStaleSessions(): void {
  const db = getDb();
  const timeoutIso = new Date(
    Date.now() - env.TUNNEL_HEARTBEAT_TIMEOUT_SECONDS * 1000,
  ).toISOString();

  db.query(
    `UPDATE tunnel_sessions
     SET status = 'disconnected', disconnected_at = datetime('now'), updated_at = datetime('now')
     WHERE status IN ('pending', 'active')
       AND (
         (last_heartbeat_at IS NOT NULL AND last_heartbeat_at < ?)
         OR (last_heartbeat_at IS NULL AND created_at < ?)
       )`,
  ).run(timeoutIso, timeoutIso);
}

/**
 * Issue a new Tunnel Session & Tunnel Grant JWT.
 */
export async function issueTunnelSession(params: {
  agentToken: string;
  requestedSubdomain?: string;
  localPort: number;
  clientIp?: string;
}): Promise<{
  sessionId: string;
  subdomain: string;
  publicUrl: string;
  wsUrl: string;
  grantToken: string;
  expiresInSeconds: number;
}> {
  cleanupStaleSessions();

  // 1. Authenticate agent token
  const agent = await validateAgentToken(params.agentToken);
  const db = getDb();

  // 2. Check active tunnel limits for user
  const user = db
    .query<{ max_tunnels: number }, [string]>("SELECT max_tunnels FROM users WHERE id = ?")
    .get(agent.userId);

  const activeCountRow = db
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) as count FROM tunnel_sessions WHERE user_id = ? AND status IN ('pending', 'active')",
    )
    .get(agent.userId);

  const maxAllowed = user?.max_tunnels ?? env.DEFAULT_USER_MAX_TUNNELS;
  if ((activeCountRow?.count ?? 0) >= maxAllowed) {
    throw new ApiError(
      400,
      "TUNNEL_LIMIT_REACHED",
      `Active tunnel limit of ${maxAllowed} reached for your account.`,
    );
  }

  // 3. Resolve subdomain
  let subdomain = params.requestedSubdomain?.trim().toLowerCase();
  if (subdomain) {
    validateSubdomainFormat(subdomain);

    // Verify ownership if reserved
    const reservation = db
      .query<{ user_id: string | null; status: string }, [string]>(
        "SELECT user_id, status FROM reserved_subdomains WHERE subdomain = ?",
      )
      .get(subdomain);

    if (reservation && reservation.status === "active" && reservation.user_id !== agent.userId) {
      throw new ApiError(403, "SUBDOMAIN_NOT_OWNED", "Subdomain belongs to another user.");
    }

    // Check if currently active in another session
    const activeSession = db
      .query<{ id: string }, [string]>(
        "SELECT id FROM tunnel_sessions WHERE subdomain = ? AND status IN ('pending', 'active')",
      )
      .get(subdomain);

    if (activeSession) {
      throw new ApiError(409, "SUBDOMAIN_IN_USE", "Subdomain is currently active in another tunnel.");
    }
  } else {
    // Generate unique random subdomain
    let attempts = 0;
    while (attempts < 10) {
      const rand = generateRandomSubdomain();
      const exists = db
        .query<{ id: string }, [string]>(
          "SELECT id FROM tunnel_sessions WHERE subdomain = ? AND status IN ('pending', 'active')",
        )
        .get(rand);
      if (!exists) {
        subdomain = rand;
        break;
      }
      attempts++;
    }
    if (!subdomain) {
      throw new ApiError(500, "SUBDOMAIN_GEN_FAILED", "Failed to allocate random subdomain.");
    }
  }

  const sessionId = crypto.randomUUID();
  const grantJti = crypto.randomUUID();
  const grantExpiresAt = new Date(Date.now() + env.TUNNEL_GRANT_TTL_SECONDS * 1000).toISOString();
  const publicUrl = `http://${subdomain}.${env.WILDCARD_BASE_DOMAIN}`;
  const targetUrl = `http://localhost:${params.localPort}`;
  const nowIso = new Date().toISOString();

  // Insert session record into DB
  db.query(
    `INSERT INTO tunnel_sessions (
      id, user_id, agent_token_id, subdomain, target_url, public_url, local_port,
      status, grant_jti, grant_expires_at, client_ip, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    agent.userId,
    agent.tokenId,
    subdomain,
    targetUrl,
    publicUrl,
    params.localPort,
    grantJti,
    grantExpiresAt,
    params.clientIp ?? null,
    nowIso,
    nowIso,
  );

  // Sign Tunnel Grant JWT
  const grantToken = await signTunnelGrant({
    jti: grantJti,
    sid: sessionId,
    uid: agent.userId,
    sdn: subdomain,
    prt: params.localPort,
  });

  return {
    sessionId,
    subdomain,
    publicUrl,
    wsUrl: `${env.GATEWAY_WS_URL}/v1/tunnel/ws`,
    grantToken,
    expiresInSeconds: env.TUNNEL_GRANT_TTL_SECONDS,
  };
}

/**
 * List tunnel sessions for a user, optionally filtered by status (e.g. status=active or status=disconnected,revoked).
 */
export function listUserTunnelSessions(userId: string, filters?: { status?: string }) {
  cleanupStaleSessions();
  const db = getDb();
  const conditions = ["user_id = ?"];
  const params: Array<string> = [userId];

  if (filters?.status) {
    const statuses = filters.status.split(",").map((s) => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      conditions.push(`status IN (${statuses.map(() => "?").join(", ")})`);
      params.push(...statuses);
    }
  } else {
    // Default to active/pending if no filter specified
    conditions.push("status IN ('pending', 'active')");
  }

  const where = conditions.join(" AND ");

  const items = db
    .query<
      {
        id: string;
        subdomain: string;
        public_url: string;
        local_port: number;
        status: string;
        connected_at: string | null;
        disconnected_at: string | null;
        created_at: string;
        last_heartbeat_at: string | null;
      },
      string[]
    >(
      `SELECT id, subdomain, public_url, local_port, status, connected_at, disconnected_at, created_at, last_heartbeat_at
       FROM tunnel_sessions
       WHERE ${where}
       ORDER BY created_at DESC`,
    )
    .all(...params);

  const total = db
    .query<{ count: number }, string[]>(`SELECT COUNT(*) AS count FROM tunnel_sessions WHERE ${where}`)
    .get(...params)?.count ?? 0;

  return { items, total };
}

/**
 * Fetch high-level user tunnel metrics for dashboard overview cards.
 */
export function getUserTunnelStats(userId: string): {
  activeTunnels: number;
  totalSessions: number;
} {
  const db = getDb();
  const activeRow = db
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) AS count FROM tunnel_sessions WHERE user_id = ? AND status IN ('pending', 'active')",
    )
    .get(userId);

  const totalRow = db
    .query<{ count: number }, [string]>("SELECT COUNT(*) AS count FROM tunnel_sessions WHERE user_id = ?")
    .get(userId);

  return {
    activeTunnels: activeRow?.count ?? 0,
    totalSessions: totalRow?.count ?? 0,
  };
}

/**
 * Disconnect/revoke a tunnel session.
 */
export function revokeTunnelSession(userId: string, sessionId: string): void {
  const db = getDb();
  const session = db
    .query<{ id: string; user_id: string; status: string }, [string]>(
      "SELECT id, user_id, status FROM tunnel_sessions WHERE id = ?",
    )
    .get(sessionId);

  if (!session || session.user_id !== userId) {
    throw new ApiError(404, "TUNNEL_NOT_FOUND", "Tunnel session not found.");
  }

  db.query(
    `UPDATE tunnel_sessions
     SET status = 'revoked', disconnected_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  ).run(sessionId);
}

/**
 * Health check probe for active tunnel session.
 */
export type TunnelHealthCheckResult = {
  checked: true;
  offline: boolean;
  skipped: boolean;
  status: "active" | "disconnected" | "skipped";
};

export async function checkTunnelSessionHealth(sessionId: string): Promise<TunnelHealthCheckResult> {
  const db = getDb();
  const session = db
    .query<{ id: string; public_url: string; status: string }, [string]>(
      "SELECT id, public_url, status FROM tunnel_sessions WHERE id = ? LIMIT 1",
    )
    .get(sessionId);

  if (!session) throw new ApiError(404, "NOT_FOUND", "Session not found.");

  if (!session.public_url || session.status === "disconnected" || session.status === "revoked") {
    return { checked: true, offline: false, skipped: true, status: "skipped" };
  }

  // Probe public URL
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  let offline = false;

  try {
    const res = await fetch(session.public_url, { method: "HEAD", signal: controller.signal });
    offline = res.status === 503;
  } catch {
    offline = true;
  } finally {
    clearTimeout(timeout);
  }

  if (offline) {
    db.query(
      "UPDATE tunnel_sessions SET status = 'disconnected', disconnected_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
    ).run(sessionId);
    return { checked: true, offline: true, skipped: false, status: "disconnected" };
  }

  return { checked: true, offline: false, skipped: false, status: "active" };
}

export async function checkTunnelSessionsHealth(sessionIds: string[]) {
  let checkedCount = 0;
  let disconnectedCount = 0;
  let aliveCount = 0;
  let skippedCount = 0;

  for (const id of sessionIds) {
    const res = await checkTunnelSessionHealth(id);
    checkedCount++;
    if (res.skipped) skippedCount++;
    else if (res.offline) disconnectedCount++;
    else aliveCount++;
  }

  return { checkedCount, disconnectedCount, aliveCount, skippedCount };
}

/**
 * Introspect Grant JTI — Gateway calls this to check if grant is valid and active.
 */
export function introspectGrantJti(jti: string): {
  valid: boolean;
  sessionId?: string;
  userId?: string;
  subdomain?: string;
  status?: string;
} {
  cleanupStaleSessions();
  const db = getDb();
  const session = db
    .query<{ id: string; user_id: string; subdomain: string; status: string; grant_expires_at: string }, [string]>(
      "SELECT id, user_id, subdomain, status, grant_expires_at FROM tunnel_sessions WHERE grant_jti = ?",
    )
    .get(jti);

  if (!session || session.status === "disconnected" || session.status === "revoked") {
    return { valid: false };
  }

  if (session.grant_expires_at && new Date(session.grant_expires_at) < new Date()) {
    return { valid: false };
  }

  return {
    valid: true,
    sessionId: session.id,
    userId: session.user_id,
    subdomain: session.subdomain,
    status: session.status,
  };
}

/**
 * Mark tunnel as active (called by Gateway on WebSocket handshake completion).
 */
export function markTunnelConnected(sessionId: string): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.query(
    `UPDATE tunnel_sessions
     SET status = 'active', connected_at = ?, last_heartbeat_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(nowIso, nowIso, nowIso, sessionId);
}

/**
 * Mark tunnel as disconnected (called by Gateway on WebSocket close).
 */
export function markTunnelDisconnected(sessionId: string): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.query(
    `UPDATE tunnel_sessions
     SET status = 'disconnected', disconnected_at = ?, updated_at = ?
     WHERE id = ?`,
  ).run(nowIso, nowIso, sessionId);
}

/**
 * Update tunnel heartbeat timestamp (called by Gateway on ping/pong).
 */
export function recordTunnelHeartbeat(sessionId: string): void {
  const db = getDb();
  const nowIso = new Date().toISOString();
  db.query(
    `UPDATE tunnel_sessions SET last_heartbeat_at = ?, updated_at = ? WHERE id = ?`,
  ).run(nowIso, nowIso, sessionId);
}
