import * as bcrypt from "bcryptjs";
import { getDb } from "../../core/db/db";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";

const TOKEN_PREFIX_LEN = 12; // e.g. "tunnix_a1b2c3"
const BCRYPT_ROUNDS = 10;

export type AgentTokenRecord = {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Generate a new random agent token string.
 * Format: tunnix_<32 random hex chars>
 */
function generateRawToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `tunnix_${hex}`;
}

/**
 * Create a new named agent token for a user.
 * Returns { id, name, token (plaintext - shown ONLY once), prefix, createdAt }
 */
export async function createAgentToken(
  userId: string,
  name: string,
): Promise<{
  id: string;
  name: string;
  token: string;
  tokenPrefix: string;
  createdAt: string;
}> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 50) {
    throw new ApiError(400, "INVALID_INPUT", "Token name must be between 1 and 50 characters.");
  }

  const rawToken = generateRawToken();
  const tokenPrefix = rawToken.substring(0, TOKEN_PREFIX_LEN);
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const db = getDb();
  db.query(
    `INSERT INTO agent_tokens (id, user_id, name, token_hash, token_prefix, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, trimmedName, tokenHash, tokenPrefix, nowIso, nowIso);

  return {
    id,
    name: trimmedName,
    token: rawToken,
    tokenPrefix,
    createdAt: nowIso,
  };
}

/**
 * List all active (non-revoked) agent tokens for a user.
 */
export function listAgentTokens(userId: string) {
  const db = getDb();
  const rows = db
    .query<
      {
        id: string;
        name: string;
        token_prefix: string;
        last_used_at: string | null;
        created_at: string;
      },
      [string]
    >(
      `SELECT id, name, token_prefix, last_used_at, created_at
       FROM agent_tokens
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
    )
    .all(userId);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    tokenPrefix: r.token_prefix,
    lastUsedAt: r.last_used_at,
    createdAt: r.created_at,
  }));
}

/**
 * Revoke an agent token by ID.
 */
export function revokeAgentToken(userId: string, tokenId: string): void {
  const db = getDb();
  const token = db
    .query<{ id: string; user_id: string; revoked_at: string | null }, [string]>(
      "SELECT id, user_id, revoked_at FROM agent_tokens WHERE id = ?",
    )
    .get(tokenId);

  if (!token || token.user_id !== userId) {
    throw new ApiError(404, "TOKEN_NOT_FOUND", "Agent token not found.");
  }

  if (token.revoked_at) {
    throw new ApiError(400, "TOKEN_ALREADY_REVOKED", "Agent token has already been revoked.");
  }

  db.query(
    "UPDATE agent_tokens SET revoked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
  ).run(tokenId);
}

/**
 * Validate plaintext agent token (used by CLI login and tunnel issuance).
 * Returns matching agent_token record & user details.
 */
export async function validateAgentToken(rawToken: string): Promise<{
  tokenId: string;
  userId: string;
  userEmail: string;
  tokenName: string;
}> {
  if (!rawToken || !rawToken.startsWith("tunnix_")) {
    throw new ApiError(401, "INVALID_AGENT_TOKEN", "Invalid agent token format.");
  }

  const prefix = rawToken.substring(0, TOKEN_PREFIX_LEN);
  const db = getDb();

  const candidates = db
    .query<
      {
        id: string;
        user_id: string;
        name: string;
        token_hash: string;
        email: string;
        status: string;
      },
      [string]
    >(
      `SELECT t.id, t.user_id, t.name, t.token_hash, u.email, u.status
       FROM agent_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE t.token_prefix = ? AND t.revoked_at IS NULL`,
    )
    .all(prefix);

  if (candidates.length === 0) {
    throw new ApiError(401, "INVALID_AGENT_TOKEN", "Agent token not found or revoked.");
  }

  for (const cand of candidates) {
    const valid = await bcrypt.compare(rawToken, cand.token_hash);
    if (valid) {
      if (cand.status !== "active") {
        throw new ApiError(403, "ACCOUNT_INACTIVE", "User account is pending or suspended.");
      }

      // Update last_used_at timestamp
      db.query(
        "UPDATE agent_tokens SET last_used_at = datetime('now') WHERE id = ?",
      ).run(cand.id);

      return {
        tokenId: cand.id,
        userId: cand.user_id,
        userEmail: cand.email,
        tokenName: cand.name,
      };
    }
  }

  throw new ApiError(401, "INVALID_AGENT_TOKEN", "Invalid agent token.");
}
