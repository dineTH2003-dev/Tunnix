-- 0005: Allowed email domains and OTP rate limiting tables
CREATE TABLE IF NOT EXISTS allowed_email_domains (
  id                  TEXT PRIMARY KEY,
  domain              TEXT NOT NULL UNIQUE,
  created_by_user_id  TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_allowed_email_domains_domain ON allowed_email_domains (domain);

CREATE TABLE IF NOT EXISTS otp_request_events (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_otp_events_email_created_at ON otp_request_events (email, created_at);
CREATE INDEX IF NOT EXISTS idx_otp_events_ip_created_at ON otp_request_events (ip_address, created_at);
