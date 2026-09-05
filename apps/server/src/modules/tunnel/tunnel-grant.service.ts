import { SignJWT, jwtVerify } from "jose";
import { getDb } from "../../core/db/db";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";
import { logInfo } from "../../core/logging";

const encoder = new TextEncoder();

// ─── Types ────────────────────────────────────────────────────────────────────

export type TunnelGrantPayload = {
  jti: string;
  sid: string;
  uid: string;
  sdn: string;
  prt: number;
};

// ─── URL Builders ─────────────────────────────────────────────────────────────

function buildHostPublicUrl(subdomain: string): string {
  try {
    const gatewayBase = new URL(env.GATEWAY_PUBLIC_BASE_URL);
    const port = gatewayBase.port;
    gatewayBase.hostname = `${subdomain}.${env.WILDCARD_BASE_DOMAIN}`;
    gatewayBase.port = port;
    gatewayBase.pathname = "";
    gatewayBase.search = "";
    gatewayBase.hash = "";
    return gatewayBase.toString().replace(/\/$/, "");
  } catch {
    return `http://${subdomain}.${env.WILDCARD_BASE_DOMAIN}`;
  }
}

function buildLocalPublicUrl(subdomain: string): string {
  try {
    const gatewayBase = new URL(env.GATEWAY_PUBLIC_BASE_URL);
    const prefix = env.DEV_TUNNEL_PATH_PREFIX.replace(/\/$/, "");
    gatewayBase.pathname = `${prefix}/${subdomain}`;
    gatewayBase.search = "";
    gatewayBase.hash = "";
    return gatewayBase.toString().replace(/\/$/, "");
  } catch {
    return `http://localhost:8080${env.DEV_TUNNEL_PATH_PREFIX}/${subdomain}`;
  }
}

// ─── Subdomain Helpers ────────────────────────────────────────────────────────

function validateSubdomainFormat(subdomain: string): string {
  const normalized = subdomain.toLowerCase().trim();
  const pattern = new RegExp(env.SUBDOMAIN_PATTERN);
  if (!pattern.test(normalized)) {
    throw new ApiError(422, "SUBDOMAIN_INVALID", "Invalid subdomain format. Use lowercase letters, numbers, and hyphens.");
  }
  return normalized;
}

function generateRandomSubdomain(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < env.RANDOM_SUBDOMAIN_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isSubdomainBlocked(db: ReturnType<typeof getDb>, subdomain: string): boolean {
  const row = db
    .query<{ id: string }, [string]>("SELECT id FROM blocked_subdomains WHERE subdomain = ? LIMIT 1")
    .get(subdomain);
  return Boolean(row);
}

function isSubdomainTaken(db: ReturnType<typeof getDb>, subdomain: string): boolean {
  const active = db
    .query<{ id: string }, [string]>(
      "SELECT id FROM tunnel_sessions WHERE subdomain = ? AND status IN ('pending', 'active') LIMIT 1",
    )
    .get(subdomain);
  return Boolean(active);
}

function resolveSubdomain(
  db: ReturnType<typeof getDb>,
  userId: string,
  requestedSubdomain?: string,
): string {
  if (requestedSubdomain) {
    const normalized = validateSubdomainFormat(requestedSubdomain);

    if (isSubdomainBlocked(db, normalized)) {
      throw new ApiError(422, "SUBDOMAIN_BLOCKED", "Requested subdomain is blocked by an administrator.");
    }

    // Check if the user owns a reservation for this subdomain
    const ownedReservation = db
      .query<{ id: string }, [string, string]>(
        "SELECT id FROM reserved_subdomains WHERE user_id = ? AND subdomain = ? AND status = 'active' LIMIT 1",
      )
      .get(userId, normalized);

    if (!ownedReservation) {
      // Also allow non-reserved subdomains as long as they're not taken by another user
      const reservation = db
        .query<{ user_id: string | null }, [string]>(
          "SELECT user_id FROM reserved_subdomains WHERE subdomain = ? AND status = 'active' LIMIT 1",
        )
        .get(normalized);

      if (reservation && reservation.user_id !== userId) {
        throw new ApiError(403, "SUBDOMAIN_NOT_OWNED", "Subdomain is reserved by another user.");
      }
    }

    // Check if currently in use by an active session
    if (isSubdomainTaken(db, normalized)) {
      throw new ApiError(409, "SUBDOMAIN_IN_USE", "Subdomain is currently active in another tunnel.");
    }

    return normalized;
  }

  // Generate a unique random subdomain
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateRandomSubdomain();
    if (!isSubdomainTaken(db, candidate) && !isSubdomainBlocked(db, candidate)) {
      return candidate;
    }
  }

  throw new ApiError(500, "INTERNAL_ERROR", "Could not allocate an available subdomain.");
}

// ─── Stale Session Cleanup ────────────────────────────────────────────────────

function cleanupStaleSessions(db: ReturnType<typeof getDb>, userId: string, nowIso: string): void {
  const heartbeatCutoff = new Date(
    Date.now() - env.TUNNEL_HEARTBEAT_TIMEOUT_SECONDS * 1000,
  ).toISOString();

  // Disconnect active sessions with no recent heartbeat
  db.query(
    `UPDATE tunnel_sessions
       SET status = 'disconnected',
           disconnected_at = COALESCE(disconnected_at, ?),
           updated_at = ?
       WHERE user_id = ?
         AND status = 'active'
         AND (last_heartbeat_at IS NULL OR last_heartbeat_at < ?)`,
  ).run(nowIso, nowIso, userId, heartbeatCutoff);

  // Disconnect pending sessions whose grant token has expired
  db.query(
    `UPDATE tunnel_sessions
       SET status = 'disconnected',
           disconnected_at = COALESCE(disconnected_at, ?),
           updated_at = ?
       WHERE user_id = ?
         AND status = 'pending'
         AND grant_expires_at IS NOT NULL
         AND grant_expires_at < ?`,
  ).run(nowIso, nowIso, userId, nowIso);
}

// ─── Grant JWT Sign / Verify ──────────────────────────────────────────────────

/**
 * Sign a short-lived Tunnel Grant JWT for agent WebSocket auth.
 */
export async function signTunnelGrant(payload: TunnelGrantPayload): Promise<string> {
  const secret = encoder.encode(env.TUNNEL_GRANT_SECRET);
  return new SignJWT({
    sid: payload.sid,
    uid: payload.uid,
    sdn: payload.sdn,
    prt: payload.prt,
    typ: "http",
  })
    .setProtectedHeader({ alg: "HS256", typ: "TGT" })
    .setIssuer(env.APP_NAME)
    .setJti(payload.jti)
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime(`${env.TUNNEL_GRANT_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verify a Tunnel Grant JWT.
 */
export async function verifyTunnelGrant(token: string): Promise<TunnelGrantPayload> {
  try {
    const secret = encoder.encode(env.TUNNEL_GRANT_SECRET);
    const { payload } = await jwtVerify(token, secret, { issuer: env.APP_NAME });

    if (!payload.jti || !payload.sid || !payload.uid || !payload.sdn || !payload.prt) {
      throw new ApiError(401, "INVALID_GRANT", "Tunnel grant payload missing required claims.");
    }

    return {
      jti: payload.jti as string,
      sid: payload.sid as string,
      uid: payload.uid as string,
      sdn: payload.sdn as string,
      prt: Number(payload.prt),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired tunnel grant.");
  }
}

// ─── Issue Tunnel Grant ───────────────────────────────────────────────────────

/**
 * Full tunnel grant issuance:
 * 1. Clean up stale sessions
 * 2. Check tunnel limit
 * 3. Resolve/validate subdomain (checks blocked + ownership)
 * 4. Create pending tunnel_session record
 * 5. Sign grant JWT
 * 6. Return all connection details for the agent
 */
export async function issueTunnelGrant(input: {
  userId: string;
  agentTokenId: string;
  port: number;
  requestedSubdomain?: string;
}): Promise<{
  grantToken: string;
  sessionId: string;
  subdomain: string;
  publicUrl: string;
  localPublicUrl: string;
  gatewayWsUrl: string;
  expiresAt: string;
}> {
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + env.TUNNEL_GRANT_TTL_SECONDS * 1000);

  cleanupStaleSessions(db, input.userId, nowIso);

  // Check user's tunnel limit
  const userRow = db
    .query<{ max_tunnels: number }, [string]>("SELECT max_tunnels FROM users WHERE id = ?")
    .get(input.userId);

  const userLimit = Math.min(
    userRow?.max_tunnels ?? env.DEFAULT_USER_MAX_TUNNELS,
    env.TUNNEL_MAX_PER_USER,
  );

  const activeCountRow = db
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) as count FROM tunnel_sessions WHERE user_id = ? AND status IN ('pending', 'active')",
    )
    .get(input.userId);

  if ((activeCountRow?.count ?? 0) >= userLimit) {
    throw new ApiError(409, "TUNNEL_LIMIT_REACHED", `Tunnel limit of ${userLimit} reached for your account.`);
  }

  const subdomain = resolveSubdomain(db, input.userId, input.requestedSubdomain);
  const sessionId = crypto.randomUUID();
  const grantJti = crypto.randomUUID();
  const publicUrl = buildHostPublicUrl(subdomain);
  const localPublicUrl = buildLocalPublicUrl(subdomain);
  const targetUrl = `http://127.0.0.1:${input.port}`;

  db.query(
    `INSERT INTO tunnel_sessions (
      id, user_id, subdomain, target_url, public_url, local_port,
      status, grant_jti, grant_expires_at, agent_token_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    input.userId,
    subdomain,
    targetUrl,
    publicUrl,
    input.port,
    grantJti,
    expiresAt.toISOString(),
    input.agentTokenId,
    nowIso,
    nowIso,
  );

  const grantToken = await signTunnelGrant({
    jti: grantJti,
    sid: sessionId,
    uid: input.userId,
    sdn: subdomain,
    prt: input.port,
  });

  logInfo("tunnel", "Tunnel grant issued", {
    userId: input.userId,
    sessionId,
    subdomain,
    localPort: input.port,
    expiresAt: expiresAt.toISOString(),
  });

  return {
    grantToken,
    sessionId,
    subdomain,
    publicUrl,
    localPublicUrl,
    gatewayWsUrl: env.GATEWAY_WS_URL,
    expiresAt: expiresAt.toISOString(),
  };
}

// ─── Grant Introspection (for Gateway) ───────────────────────────────────────

/**
 * Look up a tunnel session by its grant JTI.
 * Used by the Gateway to validate WebSocket upgrade requests.
 */
export function getTunnelGrantByJti(jti: string): {
  id: string;
  user_id: string;
  subdomain: string;
  public_url: string | null;
  local_port: number | null;
  status: string;
  grant_expires_at: string | null;
} {
  const db = getDb();
  const session = db
    .query<
      {
        id: string;
        user_id: string;
        subdomain: string;
        public_url: string | null;
        local_port: number | null;
        status: string;
        grant_expires_at: string | null;
      },
      [string]
    >(
      `SELECT id, user_id, subdomain, public_url, local_port, status, grant_expires_at
       FROM tunnel_sessions WHERE grant_jti = ? LIMIT 1`,
    )
    .get(jti);

  if (!session) {
    throw new ApiError(404, "NOT_FOUND", "Tunnel grant not found.");
  }

  if (
    session.grant_expires_at &&
    Date.parse(session.grant_expires_at) <= Date.now() &&
    session.status === "pending"
  ) {
    throw new ApiError(410, "TUNNEL_GRANT_EXPIRED", "Tunnel grant has expired.");
  }

  return session;
}

/**
 * Introspect Grant JTI — Gateway calls this to check if a grant is valid.
 */
export function introspectGrantJti(jti: string): {
  valid: boolean;
  sessionId?: string;
  userId?: string;
  subdomain?: string;
  status?: string;
} {
  const db = getDb();
  const session = db
    .query<
      { id: string; user_id: string; subdomain: string; status: string; grant_expires_at: string | null },
      [string]
    >(
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
