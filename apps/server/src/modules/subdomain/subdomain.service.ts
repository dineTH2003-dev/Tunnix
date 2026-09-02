import { getDb } from "../../core/db/db";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";

const SUBDOMAIN_REGEX = new RegExp(env.SUBDOMAIN_PATTERN);

export type SubdomainRecord = {
  id: string;
  subdomain: string;
  user_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

/**
 * Validate subdomain format against platform rules.
 */
export function validateSubdomainFormat(subdomain: string): void {
  const normalized = subdomain.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 63) {
    throw new ApiError(400, "INVALID_SUBDOMAIN", "Subdomain must be between 3 and 63 characters.");
  }

  if (!SUBDOMAIN_REGEX.test(normalized)) {
    throw new ApiError(
      400,
      "INVALID_SUBDOMAIN",
      "Subdomain can only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).",
    );
  }
}

/**
 * Reserve a subdomain for a user.
 */
export function reserveSubdomain(
  userId: string,
  subdomain: string,
): { id: string; subdomain: string; createdAt: string } {
  const normalized = subdomain.trim().toLowerCase();
  validateSubdomainFormat(normalized);

  const db = getDb();

  // 1. Check user subdomain limit
  const user = db
    .query<{ max_subdomains: number }, [string]>("SELECT max_subdomains FROM users WHERE id = ?")
    .get(userId);

  const countRow = db
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) as count FROM reserved_subdomains WHERE user_id = ? AND status = 'active'",
    )
    .get(userId);

  const currentCount = countRow?.count ?? 0;
  const maxAllowed = user?.max_subdomains ?? env.DEFAULT_USER_MAX_SUBDOMAINS;

  if (currentCount >= maxAllowed) {
    throw new ApiError(
      400,
      "SUBDOMAIN_LIMIT_REACHED",
      `Subdomain reservation limit of ${maxAllowed} reached.`,
    );
  }

  // 2. Check if blocked
  const blocked = db
    .query<{ id: string }, [string]>("SELECT id FROM blocked_subdomains WHERE subdomain = ?")
    .get(normalized);

  if (blocked) {
    throw new ApiError(400, "SUBDOMAIN_BLOCKED", "This subdomain name is restricted.");
  }

  // 3. Check if already reserved
  const existing = db
    .query<{ id: string; user_id: string | null }, [string]>(
      "SELECT id, user_id FROM reserved_subdomains WHERE subdomain = ? AND status = 'active'",
    )
    .get(normalized);

  if (existing) {
    if (existing.user_id === userId) {
      throw new ApiError(400, "ALREADY_RESERVED", "You have already reserved this subdomain.");
    }
    throw new ApiError(409, "SUBDOMAIN_TAKEN", "This subdomain is already taken.");
  }

  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  db.query(
    `INSERT INTO reserved_subdomains (id, subdomain, user_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).run(id, normalized, userId, nowIso, nowIso);

  return {
    id,
    subdomain: normalized,
    createdAt: nowIso,
  };
}

/**
 * List all active reserved subdomains for a user.
 */
export function listUserSubdomains(userId: string) {
  const db = getDb();
  const rows = db
    .query<
      { id: string; subdomain: string; status: string; created_at: string },
      [string]
    >(
      `SELECT id, subdomain, status, created_at
       FROM reserved_subdomains
       WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC`,
    )
    .all(userId);

  return rows.map((r) => ({
    id: r.id,
    subdomain: r.subdomain,
    fullDomain: `${r.subdomain}.${env.WILDCARD_BASE_DOMAIN}`,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/**
 * Release (delete) a user's reserved subdomain.
 */
export function releaseSubdomain(userId: string, subdomainId: string): void {
  const db = getDb();
  const existing = db
    .query<{ id: string; user_id: string | null; status: string }, [string]>(
      "SELECT id, user_id, status FROM reserved_subdomains WHERE id = ?",
    )
    .get(subdomainId);

  if (!existing || existing.user_id !== userId || existing.status !== "active") {
    throw new ApiError(404, "SUBDOMAIN_NOT_FOUND", "Subdomain reservation not found.");
  }

  db.query("DELETE FROM reserved_subdomains WHERE id = ?").run(subdomainId);
}
