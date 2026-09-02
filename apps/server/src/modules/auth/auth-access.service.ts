import { getDb } from "../../core/db/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthSecuritySettings = {
  otpTtlSeconds: number;
  otpRequestCooldownSeconds: number;
  otpEmailWindowSeconds: number;
  otpEmailWindowMax: number;
  otpIpWindowSeconds: number;
  otpIpWindowMax: number;
  otpMaxFailedAttempts: number;
  defaultUserMaxTunnels: number;
  defaultUserMaxSubdomains: number;
  requireAdminApproval: boolean;
  restrictEmailDomains: boolean;
};

const DEFAULTS: AuthSecuritySettings = {
  otpTtlSeconds: 600,
  otpRequestCooldownSeconds: 60,
  otpEmailWindowSeconds: 3600,
  otpEmailWindowMax: 5,
  otpIpWindowSeconds: 3600,
  otpIpWindowMax: 20,
  otpMaxFailedAttempts: 5,
  defaultUserMaxTunnels: 3,
  defaultUserMaxSubdomains: 3,
  requireAdminApproval: true,
  restrictEmailDomains: false,
};

// ---------------------------------------------------------------------------
// Auth Security Settings (runtime configurable)
// ---------------------------------------------------------------------------

export function getAuthSecuritySettings(): AuthSecuritySettings {
  const db = getDb();
  const rows = db
    .query<{ key: string; value: string }, []>("SELECT key, value FROM auth_settings")
    .all();

  const map = new Map(rows.map((r) => [r.key, r.value]));

  const readNum = (key: string, fallback: number): number => {
    const raw = map.get(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const readBool = (key: string, fallback: boolean): boolean => {
    const raw = map.get(key);
    if (raw === undefined) return fallback;
    return raw === "true" || raw === "1";
  };

  return {
    otpTtlSeconds: readNum("otp_ttl_seconds", DEFAULTS.otpTtlSeconds),
    otpRequestCooldownSeconds: readNum("otp_request_cooldown_seconds", DEFAULTS.otpRequestCooldownSeconds),
    otpEmailWindowSeconds: readNum("otp_email_window_seconds", DEFAULTS.otpEmailWindowSeconds),
    otpEmailWindowMax: readNum("otp_email_window_max", DEFAULTS.otpEmailWindowMax),
    otpIpWindowSeconds: readNum("otp_ip_window_seconds", DEFAULTS.otpIpWindowSeconds),
    otpIpWindowMax: readNum("otp_ip_window_max", DEFAULTS.otpIpWindowMax),
    otpMaxFailedAttempts: readNum("otp_max_failed_attempts", DEFAULTS.otpMaxFailedAttempts),
    defaultUserMaxTunnels: readNum("default_user_max_tunnels", DEFAULTS.defaultUserMaxTunnels),
    defaultUserMaxSubdomains: readNum("default_user_max_subdomains", DEFAULTS.defaultUserMaxSubdomains),
    requireAdminApproval: readBool("require_admin_approval", DEFAULTS.requireAdminApproval),
    restrictEmailDomains: readBool("restrict_email_domains", DEFAULTS.restrictEmailDomains),
  };
}

export function updateAuthSecuritySettings(
  actorUserId: string,
  input: Partial<Omit<AuthSecuritySettings, "requireAdminApproval" | "restrictEmailDomains">> & {
    requireAdminApproval?: boolean;
    restrictEmailDomains?: boolean;
  },
): AuthSecuritySettings {
  const db = getDb();
  const now = new Date().toISOString();

  const entries: Array<[string, string]> = [];

  if (input.otpTtlSeconds !== undefined) entries.push(["otp_ttl_seconds", String(input.otpTtlSeconds)]);
  if (input.otpRequestCooldownSeconds !== undefined) entries.push(["otp_request_cooldown_seconds", String(input.otpRequestCooldownSeconds)]);
  if (input.otpEmailWindowSeconds !== undefined) entries.push(["otp_email_window_seconds", String(input.otpEmailWindowSeconds)]);
  if (input.otpEmailWindowMax !== undefined) entries.push(["otp_email_window_max", String(input.otpEmailWindowMax)]);
  if (input.otpIpWindowSeconds !== undefined) entries.push(["otp_ip_window_seconds", String(input.otpIpWindowSeconds)]);
  if (input.otpIpWindowMax !== undefined) entries.push(["otp_ip_window_max", String(input.otpIpWindowMax)]);
  if (input.otpMaxFailedAttempts !== undefined) entries.push(["otp_max_failed_attempts", String(input.otpMaxFailedAttempts)]);
  if (input.defaultUserMaxTunnels !== undefined) entries.push(["default_user_max_tunnels", String(input.defaultUserMaxTunnels)]);
  if (input.defaultUserMaxSubdomains !== undefined) entries.push(["default_user_max_subdomains", String(input.defaultUserMaxSubdomains)]);
  if (input.requireAdminApproval !== undefined) entries.push(["require_admin_approval", input.requireAdminApproval ? "true" : "false"]);
  if (input.restrictEmailDomains !== undefined) entries.push(["restrict_email_domains", input.restrictEmailDomains ? "true" : "false"]);

  for (const [key, value] of entries) {
    db.query(
      `INSERT INTO auth_settings (key, value, updated_by_user_id, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_by_user_id = excluded.updated_by_user_id,
         updated_at = excluded.updated_at`,
    ).run(key, value, actorUserId, now);
  }

  return getAuthSecuritySettings();
}

// ---------------------------------------------------------------------------
// Allowed Email Domains
// ---------------------------------------------------------------------------

export type AllowedEmailDomainRecord = {
  id: string;
  domain: string;
  created_by_user_id: string | null;
  created_by_user_email: string | null;
  created_at: string;
};

export function listAllowedEmailDomains(): AllowedEmailDomainRecord[] {
  const db = getDb();
  return db
    .query<AllowedEmailDomainRecord, []>(
      `SELECT
         allowed_email_domains.id,
         allowed_email_domains.domain,
         allowed_email_domains.created_by_user_id,
         users.email AS created_by_user_email,
         allowed_email_domains.created_at
       FROM allowed_email_domains
       LEFT JOIN users ON users.id = allowed_email_domains.created_by_user_id
       ORDER BY allowed_email_domains.domain ASC`,
    )
    .all();
}

export function createAllowedEmailDomain(input: {
  domain: string;
  actorUserId: string;
}): { id: string; domain: string; activatedUsers: number } {
  const db = getDb();
  const normalized = input.domain.trim().toLowerCase();
  const now = new Date().toISOString();

  const existing = db
    .query<{ id: string }, [string]>("SELECT id FROM allowed_email_domains WHERE domain = ? LIMIT 1")
    .get(normalized);

  if (existing) {
    throw new Error("DOMAIN_EXISTS:This email domain is already allowed.");
  }

  const id = crypto.randomUUID();

  // Start transaction: insert domain + activate matching pending users
  db.exec("BEGIN");
  try {
    db.query(
      `INSERT INTO allowed_email_domains (id, domain, created_by_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, normalized, input.actorUserId, now, now);

    const result = db.query(
      `UPDATE users
       SET status = 'active', approved_at = COALESCE(approved_at, ?), updated_at = ?
       WHERE status = 'pending'
         AND lower(substr(email, instr(email, '@') + 1)) = ?`,
    ).run(now, now, normalized) as { changes?: number };

    db.exec("COMMIT");
    return { id, domain: normalized, activatedUsers: result.changes ?? 0 };
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function deleteAllowedEmailDomain(id: string): { deleted: boolean; domain: string | null } {
  const db = getDb();
  const existing = db
    .query<{ id: string; domain: string }, [string]>(
      "SELECT id, domain FROM allowed_email_domains WHERE id = ? LIMIT 1",
    )
    .get(id);

  if (!existing) return { deleted: false, domain: null };

  const result = db
    .query("DELETE FROM allowed_email_domains WHERE id = ?")
    .run(id) as { changes?: number };

  return { deleted: (result.changes ?? 0) === 1, domain: existing.domain };
}

export function isEmailDomainAllowed(email: string): boolean {
  const db = getDb();
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;

  const row = db
    .query<{ id: string }, [string]>("SELECT id FROM allowed_email_domains WHERE domain = ? LIMIT 1")
    .get(domain);

  return Boolean(row);
}
