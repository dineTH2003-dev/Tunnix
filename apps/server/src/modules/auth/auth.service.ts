import { getDb } from "../../core/db/db";
import { ApiError } from "../../core/errors";
import { logInfo, logWarn } from "../../core/logging";
import { createOtpChallenge, verifyOtpChallenge } from "./otp.service";
import { sendOtpEmail } from "./email.service";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from "./jwt.service";

export type UserRecord = {
  id: string;
  email: string;
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  name: string;
  max_tunnels: number;
  max_subdomains: number;
  allowed_platforms: string;
  created_at: string;
  updated_at: string;
};

/** Load a runtime auth setting from DB */
function getSetting(key: string, fallback: number): number {
  const db = getDb();
  const row = db
    .query<{ value: string }, [string]>("SELECT value FROM auth_settings WHERE key = ?")
    .get(key);
  return row ? parseInt(row.value, 10) : fallback;
}

function getSettingBool(key: string, fallback: boolean): boolean {
  const db = getDb();
  const row = db
    .query<{ value: string }, [string]>("SELECT value FROM auth_settings WHERE key = ?")
    .get(key);
  return row ? row.value === "true" : fallback;
}

/** Check allowed domain rule if domain restriction is enabled */
function checkDomainAllowed(email: string): void {
  const restrict = getSettingBool("restrict_email_domains", false);
  if (!restrict) return;

  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) {
    throw new ApiError(400, "INVALID_EMAIL", "Invalid email address format.");
  }

  const db = getDb();
  const match = db
    .query<{ id: string }, [string]>("SELECT id FROM allowed_email_domains WHERE domain = ?")
    .get(domain);

  if (!match) {
    throw new ApiError(403, "DOMAIN_NOT_ALLOWED", "Email domain is not authorized for access.");
  }
}

/** Enforce per-email and per-IP rate limits on OTP requests */
function enforceOtpRateLimits(email: string, ip: string): void {
  const db = getDb();
  const cooldownSec = getSetting("otp_request_cooldown_seconds", 60);
  const emailWindowSec = getSetting("otp_email_window_seconds", 3600);
  const emailWindowMax = getSetting("otp_email_window_max", 5);
  const ipWindowSec = getSetting("otp_ip_window_seconds", 3600);
  const ipWindowMax = getSetting("otp_ip_window_max", 20);

  const now = new Date();

  // 1. Check cooldown (last request for this email)
  const lastEvent = db
    .query<{ created_at: string }, [string]>(
      "SELECT created_at FROM otp_request_events WHERE email = ? ORDER BY created_at DESC LIMIT 1",
    )
    .get(email);

  if (lastEvent) {
    const elapsedSec = (now.getTime() - new Date(lastEvent.created_at).getTime()) / 1000;
    if (elapsedSec < cooldownSec) {
      const wait = Math.ceil(cooldownSec - elapsedSec);
      throw new ApiError(
        429,
        "OTP_COOLDOWN",
        `Please wait ${wait} seconds before requesting another code.`,
      );
    }
  }

  // 2. Check per-email window
  const emailWindowStart = new Date(now.getTime() - emailWindowSec * 1000).toISOString();
  const emailCountRow = db
    .query<{ count: number }, [string, string]>(
      "SELECT COUNT(*) as count FROM otp_request_events WHERE email = ? AND created_at >= ?",
    )
    .get(email, emailWindowStart);

  if ((emailCountRow?.count ?? 0) >= emailWindowMax) {
    throw new ApiError(429, "OTP_RATE_LIMIT", "Too many OTP requests for this email.");
  }

  // 3. Check per-IP window
  const ipWindowStart = new Date(now.getTime() - ipWindowSec * 1000).toISOString();
  const ipCountRow = db
    .query<{ count: number }, [string, string]>(
      "SELECT COUNT(*) as count FROM otp_request_events WHERE ip_address = ? AND created_at >= ?",
    )
    .get(ip, ipWindowStart);

  if ((ipCountRow?.count ?? 0) >= ipWindowMax) {
    throw new ApiError(429, "OTP_RATE_LIMIT", "Too many OTP requests from this IP address.");
  }

  // Log event
  db.query(
    "INSERT INTO otp_request_events (id, email, ip_address) VALUES (?, ?, ?)",
  ).run(crypto.randomUUID(), email, ip);
}

/** Record audit log event */
function recordAuditLog(
  actorUserId: string | null,
  action: string,
  entityType?: string,
  entityId?: string,
  ip?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>,
): void {
  const db = getDb();
  db.query(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, ip_address, user_agent, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    actorUserId,
    action,
    entityType ?? null,
    entityId ?? null,
    ip ?? null,
    userAgent ?? null,
    metadata ? JSON.stringify(metadata) : null,
  );
}

/**
 * Step 1: Request OTP code
 */
export async function requestOtp(
  email: string,
  ip: string,
  userAgent?: string,
): Promise<{ challengeId: string; expiresInSeconds: number }> {
  const normalizedEmail = email.trim().toLowerCase();

  checkDomainAllowed(normalizedEmail);
  enforceOtpRateLimits(normalizedEmail, ip);

  const { challengeId, otp, expiresAt } = await createOtpChallenge(normalizedEmail);
  await sendOtpEmail(normalizedEmail, otp);

  recordAuditLog(null, "auth.request_otp", "user", normalizedEmail, ip, userAgent, {
    challengeId,
  });

  const expiresInSeconds = Math.round((expiresAt.getTime() - Date.now()) / 1000);
  return { challengeId, expiresInSeconds };
}

/**
 * Step 2: Verify OTP code & return tokens
 */
export async function verifyOtp(
  challengeId: string,
  otp: string,
  ip: string,
  userAgent?: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: "user" | "admin";
    status: "pending" | "active" | "suspended";
    name: string;
  };
}> {
  const email = await verifyOtpChallenge(challengeId, otp);
  const db = getDb();
  const nowIso = new Date().toISOString();

  // Find or create user
  let user = db
    .query<UserRecord, [string]>("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    const requireApproval = getSettingBool("require_admin_approval", true);
    const isFirstUser =
      (db.query<{ count: number }, []>("SELECT COUNT(*) as count FROM users").get()?.count ?? 0) === 0;

    // First user is automatically admin and active
    const initialRole = isFirstUser ? "admin" : "user";
    const initialStatus = isFirstUser || !requireApproval ? "active" : "pending";
    const approvedAt = initialStatus === "active" ? nowIso : null;
    const name = email.split("@")[0];

    const userId = crypto.randomUUID();
    db.query(
      `INSERT INTO users (id, email, role, status, name, approved_at, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(userId, email, initialRole, initialStatus, name, approvedAt, nowIso, nowIso, nowIso);

    user = db.query<UserRecord, [string]>("SELECT * FROM users WHERE id = ?").get(userId)!;
    recordAuditLog(userId, "auth.user_registered", "user", userId, ip, userAgent, {
      role: initialRole,
      status: initialStatus,
    });
  } else {
    // Update email verified timestamp if needed
    if (!user.email_verified_at) {
      db.query("UPDATE users SET email_verified_at = ? WHERE id = ?").run(nowIso, user.id);
    }
  }

  if (user.status === "suspended") {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended.");
  }

  // Create session
  const sessionId = crypto.randomUUID();
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.query(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(sessionId, user.id, sessionExpiresAt);

  const accessTokenPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    sid: sessionId,
  };

  const accessToken = await signAccessToken(accessTokenPayload);
  const refreshToken = await signRefreshToken({
    sub: user.id,
    sid: sessionId,
    type: "refresh",
  });

  recordAuditLog(user.id, "auth.login", "session", sessionId, ip, userAgent);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      name: user.name,
    },
  };
}

/**
 * Refresh Access Token using Refresh Token
 */
export async function refreshSession(refreshTokenStr: string): Promise<{ accessToken: string }> {
  const payload = await verifyRefreshToken(refreshTokenStr);
  const db = getDb();

  const session = db
    .query<{ id: string; user_id: string; revoked_at: string | null; expires_at: string }, [string]>(
      "SELECT * FROM sessions WHERE id = ?",
    )
    .get(payload.sid);

  if (!session || session.revoked_at) {
    throw new ApiError(401, "SESSION_REVOKED", "Session has been revoked or expired.");
  }

  if (new Date(session.expires_at) < new Date()) {
    throw new ApiError(401, "SESSION_EXPIRED", "Session has expired.");
  }

  const user = db
    .query<UserRecord, [string]>("SELECT * FROM users WHERE id = ?")
    .get(session.user_id);

  if (!user || user.status === "suspended") {
    throw new ApiError(403, "USER_INACTIVE", "User account is inactive or suspended.");
  }

  const accessTokenPayload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    sid: session.id,
  };

  const accessToken = await signAccessToken(accessTokenPayload);
  return { accessToken };
}

/**
 * Logout — Revoke session
 */
export async function logoutSession(sessionId: string): Promise<void> {
  const db = getDb();
  db.query("UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?").run(sessionId);
}
