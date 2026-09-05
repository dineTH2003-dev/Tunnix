import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { authMiddleware, activeUserGuard } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rate-limit";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { env } from "../../core/env";
import { verifyTurnstileToken } from "./turnstile.service";
import { listAllowedEmailDomains, isEmailDomainAllowed } from "./auth-access.service";
import { getDb } from "../../core/db/db";
import { writeAuditLog } from "../audit/audit.service";
import {
  requestOtp,
  verifyOtp,
  refreshSession,
  logoutSession,
} from "./auth.service";

export const authRoutes = new Hono();

// ─── GET /v1/auth/client-config ───────────────────────────────────────────────
// Public — fetched on app load to get server config (turnstile key, product name, etc.)
authRoutes.get("/client-config", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const turnstileEnabled = Boolean(env.TURNSTILE_SECRET_KEY);
  const domains = listAllowedEmailDomains().map((d) => d.domain);

  return c.json(
    toSuccessResponse(
      {
        turnstileEnabled,
        turnstileSiteKey: null, // Tunnix uses TURNSTILE_SECRET_KEY server-side only
        requestableDomains: domains,
        publicBaseDomain: env.WILDCARD_BASE_DOMAIN,
        productName: env.APP_NAME,
        cliName: "tunnix",
        subdomainRules: {
          minLength: 3,
          maxLength: 63,
          allowedDescription: "Use lowercase letters, numbers, and hyphens.",
        },
      },
      requestId,
    ),
  );
});

// ─── POST /v1/auth/request-access ─────────────────────────────────────────────
// Public — landing page "request access" form.
// If the email domain is already allowed → returns status: active.
// Otherwise records a pending request.
authRoutes.post("/request-access", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "INVALID_INPUT", "Valid email address is required.");
  }

  const alreadyAllowed = isEmailDomainAllowed(email);

  return c.json(
    toSuccessResponse(
      {
        status: alreadyAllowed ? "active" : "pending",
        message: alreadyAllowed
          ? "Your email domain is already approved. Sign in to continue."
          : "Your access request was received. An administrator will review it soon.",
      },
      requestId,
    ),
    201,
  );
});

// POST /v1/auth/request-otp (Max 10 per minute per IP)
authRoutes.post("/request-otp", rateLimit(60_000, 10, "request-otp"), async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));

  const { email, turnstileToken } = body;
  if (!email || typeof email !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Email is required.");
  }

  const clientIp = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "127.0.0.1";
  const userAgent = c.req.header("user-agent");

  // Verify CAPTCHA
  await verifyTurnstileToken(turnstileToken, clientIp);

  const result = await requestOtp(email, clientIp, userAgent);
  return c.json(toSuccessResponse(result, requestId), 201);
});

// POST /v1/auth/verify-otp (Max 15 per minute per IP)
authRoutes.post("/verify-otp", rateLimit(60_000, 15, "verify-otp"), async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));

  const { challengeId, otp } = body;
  if (!challengeId || !otp) {
    throw new ApiError(400, "INVALID_INPUT", "challengeId and otp are required.");
  }

  const clientIp = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "127.0.0.1";
  const userAgent = c.req.header("user-agent");

  const result = await verifyOtp(challengeId, otp, clientIp, userAgent);

  // Set HttpOnly refresh token cookie
  setCookie(c, "refresh_token", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return c.json(
    toSuccessResponse(
      {
        accessToken: result.accessToken,
        user: result.user,
      },
      requestId,
    ),
    200,
  );
});

// POST /v1/auth/refresh
authRoutes.post("/refresh", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const body = await c.req.json().catch(() => ({}));
  const cookieToken = getCookie(c, "refresh_token");
  const refreshToken = body.refreshToken || cookieToken;

  if (!refreshToken) {
    throw new ApiError(400, "INVALID_INPUT", "Refresh token required.");
  }

  const result = await refreshSession(refreshToken);
  return c.json(toSuccessResponse(result, requestId), 200);
});

// POST /v1/auth/logout
authRoutes.post("/logout", authMiddleware, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const sid = c.get("sessionId" as never);
  if (sid) {
    await logoutSession(sid);
  }

  setCookie(c, "refresh_token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return c.json(toSuccessResponse({ loggedOut: true }, requestId), 200);
});// GET /v1/auth/me (Fetch latest user profile from database)
authRoutes.get("/me", authMiddleware, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;

  const db = (await import("../../core/db/db")).getDb();
  const user = db
    .query<
      {
        id: string;
        email: string;
        role: "admin" | "user";
        status: "pending" | "active" | "suspended";
        name: string | null;
        max_tunnels: number;
        max_subdomains: number;
        created_at: string;
      },
      [string]
    >("SELECT id, email, role, status, name, max_tunnels, max_subdomains, created_at FROM users WHERE id = ?")
    .get(userId);

  if (!user) {
    throw new ApiError(404, "USER_NOT_FOUND", "User profile not found.");
  }

  return c.json(
    toSuccessResponse(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        maxTunnels: user.max_tunnels,
        maxSubdomains: user.max_subdomains,
        createdAt: user.created_at,
      },
      requestId,
    ),
    200,
  );
});

// ─── PUT /v1/auth/profile ──────────────────────────────────────────────────────
// Protected — update display name for the logged-in user.
authRoutes.put("/profile", authMiddleware, activeUserGuard, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never) as string;

  const body = await c.req.json().catch(() => {
    throw new ApiError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2 || name.length > 80) {
    throw new ApiError(400, "VALIDATION_ERROR", "Name must be between 2 and 80 characters.");
  }

  const db = getDb();
  const nowIso = new Date().toISOString();

  db.query("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(name, nowIso, userId);

  const user = db
    .query<
      {
        id: string;
        email: string;
        role: string;
        status: string;
        name: string;
        max_tunnels: number;
        max_subdomains: number;
        created_at: string;
      },
      [string]
    >("SELECT id, email, role, status, name, max_tunnels, max_subdomains, created_at FROM users WHERE id = ?")
    .get(userId);

  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");

  writeAuditLog({
    actorUserId: userId,
    action: "user_profile_updated",
    entityType: "user",
    entityId: userId,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { name },
  });

  return c.json(
    toSuccessResponse(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        name: user.name,
        maxTunnels: user.max_tunnels,
        maxSubdomains: user.max_subdomains,
        createdAt: user.created_at,
      },
      requestId,
    ),
    200,
  );
});
