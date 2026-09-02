-- 0006: Runtime-configurable auth settings (OTP TTL, rate limits, etc.)
CREATE TABLE IF NOT EXISTS auth_settings (
  key                TEXT PRIMARY KEY,
  value              TEXT NOT NULL,
  updated_by_user_id TEXT,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_ttl_seconds', '600');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_request_cooldown_seconds', '60');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_email_window_seconds', '3600');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_email_window_max', '5');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_ip_window_seconds', '3600');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_ip_window_max', '20');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('otp_max_failed_attempts', '5');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('require_admin_approval', 'true');
INSERT OR IGNORE INTO auth_settings (key, value) VALUES ('restrict_email_domains', 'false');
