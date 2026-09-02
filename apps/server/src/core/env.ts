// Validates and exports all environment variables.
// The server will fail fast at startup if required vars are missing.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function requireInt(key: string): number {
  const raw = requireEnv(key);
  const value = parseInt(raw, 10);
  if (isNaN(value)) {
    throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  }
  return value;
}

export const env = {
  APP_NAME: optionalEnv("APP_NAME", "tunnix"),
  PORT: parseInt(optionalEnv("PORT", "4310"), 10),
  DATABASE_URL: optionalEnv("DATABASE_URL", "./tunnix.db"),

  // JWT
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
  TUNNEL_GRANT_SECRET: requireEnv("TUNNEL_GRANT_SECRET"),
  INTERNAL_GATEWAY_SECRET: requireEnv("INTERNAL_GATEWAY_SECRET"),

  // CORS
  CORS_ORIGIN: optionalEnv("CORS_ORIGIN", "http://localhost:5310"),

  // Email
  BREVO_API_KEY: optionalEnv("BREVO_API_KEY", ""),
  EMAIL_FROM_ADDRESS: optionalEnv("EMAIL_FROM_ADDRESS", "noreply@tunnix.local"),

  // Turnstile
  TURNSTILE_SECRET_KEY: optionalEnv("TURNSTILE_SECRET_KEY", ""),
  TURNSTILE_BYPASS_IN_DEV: optionalEnv("TURNSTILE_BYPASS_IN_DEV", "false") === "true",

  // Gateway
  GATEWAY_PUBLIC_BASE_URL: optionalEnv("GATEWAY_PUBLIC_BASE_URL", "http://localhost:8080"),
  GATEWAY_WS_URL: optionalEnv("GATEWAY_WS_URL", "ws://localhost:9000"),
  WILDCARD_BASE_DOMAIN: optionalEnv("WILDCARD_BASE_DOMAIN", "localhost"),

  // Tunnel limits
  TUNNEL_GRANT_TTL_SECONDS: parseInt(optionalEnv("TUNNEL_GRANT_TTL_SECONDS", "1800"), 10),
  TUNNEL_HEARTBEAT_TIMEOUT_SECONDS: parseInt(optionalEnv("TUNNEL_HEARTBEAT_TIMEOUT_SECONDS", "120"), 10),
  TUNNEL_MAX_PER_USER: parseInt(optionalEnv("TUNNEL_MAX_PER_USER", "10"), 10),
  DEFAULT_USER_MAX_TUNNELS: parseInt(optionalEnv("DEFAULT_USER_MAX_TUNNELS", "3"), 10),
  DEFAULT_USER_MAX_SUBDOMAINS: parseInt(optionalEnv("DEFAULT_USER_MAX_SUBDOMAINS", "3"), 10),
  RANDOM_SUBDOMAIN_LENGTH: parseInt(optionalEnv("RANDOM_SUBDOMAIN_LENGTH", "8"), 10),
  SUBDOMAIN_PATTERN: optionalEnv("SUBDOMAIN_PATTERN", "^[a-z0-9]([a-z0-9-]*[a-z0-9])?$"),
  DEV_TUNNEL_PATH_PREFIX: optionalEnv("DEV_TUNNEL_PATH_PREFIX", "/dev-tunnel"),

  // Debug
  AUTH_DEBUG_LOG_OTP: optionalEnv("AUTH_DEBUG_LOG_OTP", "false") === "true",
} as const;
