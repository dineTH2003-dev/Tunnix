import { Hono } from "hono";
import { cors } from "hono/cors";

import { env } from "./core/env";
import { ApiError, normalizeError, toErrorResponse, toSuccessResponse } from "./core/errors";
import { logWarn, logError } from "./core/logging";
import type { AppVariables } from "./core/types";
import { requestLogger } from "./middleware/request-logger";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { agentTokenRoutes } from "./modules/agent/agent-token.routes";
import { agentAuthRoutes } from "./modules/agent/agent-auth.routes";
import { subdomainRoutes } from "./modules/subdomain/subdomain.routes";
import { tunnelUserRoutes } from "./modules/tunnel/tunnel-user.routes";
import { tunnelInternalRoutes } from "./modules/tunnel/tunnel-internal.routes";

export const app = new Hono<{ Variables: AppVariables }>();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
    exposeHeaders: ["x-request-id"],
    credentials: true,
  }),
);

app.use("*", requestLogger);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  const requestId = c.get("requestId");
  return c.json(
    toSuccessResponse(
      { service: env.APP_NAME, version: "0.1.0", basePath: "/v1" },
      requestId,
    ),
  );
});

app.route("/health", healthRoutes);
app.route("/v1/auth", authRoutes);
app.route("/v1/agent-tokens", agentTokenRoutes);
app.route("/v1/auth/agent-login", agentAuthRoutes);
app.route("/v1/subdomains", subdomainRoutes);
app.route("/v1/tunnel/sessions", tunnelUserRoutes);
app.route("/v1/internal/tunnel", tunnelInternalRoutes);

// NOTE: Auth, tunnel, agent, and admin routes will be mounted here in Phase 2+

// ─── Error Handling ───────────────────────────────────────────────────────────

app.notFound((c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const error = new ApiError(404, "NOT_FOUND", "Route not found.");
  logWarn("http", "404 Not Found", { requestId, path: c.req.path });
  return c.json(toErrorResponse(error, requestId), 404);
});

app.onError((err, c) => {
  const requestId = c.get("requestId" as never) ?? "unknown";
  const normalized = normalizeError(err);

  if (normalized.status < 500) {
    logWarn("http", `Client error (${normalized.status})`, {
      requestId,
      path: c.req.path,
      code: normalized.code,
      message: normalized.message,
    });
  } else {
    logError("http", "Unhandled server error", {
      requestId,
      path: c.req.path,
      code: normalized.code,
      message: normalized.message,
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  return c.json(toErrorResponse(normalized, requestId), normalized.status);
});
