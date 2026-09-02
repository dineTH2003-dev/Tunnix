import * as bcrypt from "bcryptjs";
import { getDb } from "../../core/db/db";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";
import { logDebug } from "../../core/logging";

const OTP_DIGITS = 6;
const BCRYPT_ROUNDS = 10;

/** Generate a random 6-digit OTP string */
function generateOtp(): string {
  const max = Math.pow(10, OTP_DIGITS);
  const raw = Math.floor(Math.random() * max);
  return raw.toString().padStart(OTP_DIGITS, "0");
}

/** Load a runtime setting from auth_settings table */
function getSetting(key: string, fallback: number): number {
  const db = getDb();
  const row = db.query<{ value: string }, [string]>(
    "SELECT value FROM auth_settings WHERE key = ?",
  ).get(key);
  return row ? parseInt(row.value, 10) : fallback;
}

/**
 * Create a new OTP challenge for the given email.
 * Returns { challengeId, otp (plain), expiresAt }
 */
export async function createOtpChallenge(email: string): Promise<{
  challengeId: string;
  otp: string;
  expiresAt: Date;
}> {
  const db = getDb();
  const ttlSeconds = getSetting("otp_ttl_seconds", 600);
  const otp = generateOtp();
  const hash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Invalidate any previous open challenge for this email
  db.query(
    `UPDATE otp_challenges SET consumed_at = datetime('now')
     WHERE email = ? AND consumed_at IS NULL`,
  ).run(email);

  db.query(
    `INSERT INTO otp_challenges (id, email, otp_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(id, email, hash, expiresAt.toISOString());

  if (env.AUTH_DEBUG_LOG_OTP) {
    logDebug("otp", `[DEBUG] OTP for ${email}: ${otp}`);
  }

  return { challengeId: id, otp, expiresAt };
}

/**
 * Verify an OTP against an existing challenge.
 * Returns the email on success; throws ApiError on any failure.
 */
export async function verifyOtpChallenge(
  challengeId: string,
  otp: string,
): Promise<string> {
  const db = getDb();
  const maxAttempts = getSetting("otp_max_failed_attempts", 5);

  const challenge = db
    .query<
      {
        id: string;
        email: string;
        otp_hash: string;
        expires_at: string;
        consumed_at: string | null;
        failed_attempts: number;
      },
      [string]
    >("SELECT * FROM otp_challenges WHERE id = ?")
    .get(challengeId);

  if (!challenge) {
    throw new ApiError(404, "CHALLENGE_NOT_FOUND", "OTP challenge not found.");
  }

  if (challenge.consumed_at) {
    throw new ApiError(400, "OTP_ALREADY_USED", "OTP has already been used.");
  }

  if (new Date(challenge.expires_at) < new Date()) {
    throw new ApiError(400, "OTP_EXPIRED", "OTP has expired.");
  }

  if (challenge.failed_attempts >= maxAttempts) {
    throw new ApiError(400, "OTP_MAX_ATTEMPTS", "Too many failed OTP attempts.");
  }

  const valid = await bcrypt.compare(otp, challenge.otp_hash);

  if (!valid) {
    db.query(
      `UPDATE otp_challenges
       SET failed_attempts = failed_attempts + 1, last_attempt_at = datetime('now')
       WHERE id = ?`,
    ).run(challengeId);
    throw new ApiError(400, "INVALID_OTP", "Invalid OTP code.");
  }

  // Mark consumed
  db.query(
    "UPDATE otp_challenges SET consumed_at = datetime('now') WHERE id = ?",
  ).run(challengeId);

  return challenge.email;
}
