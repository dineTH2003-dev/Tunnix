-- 0003: Agent tokens, tunnel sessions, subdomains, audit logs
CREATE TABLE IF NOT EXISTS agent_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_agent_tokens_user_id ON agent_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tokens_token_prefix ON agent_tokens (token_prefix);
CREATE INDEX IF NOT EXISTS idx_agent_tokens_revoked_at ON agent_tokens (revoked_at);

CREATE TABLE IF NOT EXISTS tunnel_sessions (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  agent_token_id    TEXT,
  subdomain         TEXT NOT NULL,
  target_url        TEXT NOT NULL,
  public_url        TEXT,
  local_port        INTEGER,
  status            TEXT NOT NULL DEFAULT 'pending',
  grant_jti         TEXT,
  grant_expires_at  TEXT,
  client_ip         TEXT,
  connected_at      TEXT,
  disconnected_at   TEXT,
  last_heartbeat_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (agent_token_id) REFERENCES agent_tokens(id)
);

CREATE INDEX IF NOT EXISTS idx_tunnel_sessions_user_id ON tunnel_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_tunnel_sessions_status ON tunnel_sessions (status);
CREATE INDEX IF NOT EXISTS idx_tunnel_sessions_subdomain ON tunnel_sessions (subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tunnel_sessions_grant_jti ON tunnel_sessions (grant_jti);

CREATE TABLE IF NOT EXISTS reserved_subdomains (
  id         TEXT PRIMARY KEY,
  subdomain  TEXT NOT NULL UNIQUE,
  user_id    TEXT,
  status     TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_reserved_subdomains_user_id ON reserved_subdomains (user_id);
CREATE INDEX IF NOT EXISTS idx_reserved_subdomains_status ON reserved_subdomains (status);

CREATE TABLE IF NOT EXISTS blocked_subdomains (
  id         TEXT PRIMARY KEY,
  subdomain  TEXT NOT NULL UNIQUE,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action        TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     TEXT,
  ip_address    TEXT,
  user_agent    TEXT,
  metadata_json TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
