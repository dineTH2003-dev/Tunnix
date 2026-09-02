-- 0001: Initial users and OTP challenge tables
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  role          TEXT NOT NULL DEFAULT 'user',
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL,
  otp_hash        TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  consumed_at     TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_email ON otp_challenges (email);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires_at ON otp_challenges (expires_at);
