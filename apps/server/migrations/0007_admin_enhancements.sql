-- 0007: Admin enhancements — blocked_subdomains metadata, otp_request_events, user request metadata

-- Add blocked_by and reason to blocked_subdomains
ALTER TABLE blocked_subdomains ADD COLUMN blocked_by_user_id TEXT REFERENCES users(id);
ALTER TABLE blocked_subdomains ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

-- Add user request metadata columns (for admin review queue)
ALTER TABLE users ADD COLUMN request_source TEXT;
ALTER TABLE users ADD COLUMN requested_subdomain TEXT;
ALTER TABLE users ADD COLUMN request_submitted_at TEXT;

-- Ensure otp_request_events table exists with ip column
CREATE TABLE IF NOT EXISTS otp_request_events (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  ip_address TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_otp_request_events_email ON otp_request_events (email);
CREATE INDEX IF NOT EXISTS idx_otp_request_events_ip ON otp_request_events (ip_address);
CREATE INDEX IF NOT EXISTS idx_otp_request_events_created_at ON otp_request_events (created_at);
