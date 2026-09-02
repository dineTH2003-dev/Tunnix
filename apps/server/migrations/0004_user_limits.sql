-- 0004: User profile columns and per-user limits
ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN max_tunnels INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN max_subdomains INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN allowed_platforms TEXT NOT NULL DEFAULT 'windows,linux,mac,mac-intel';
