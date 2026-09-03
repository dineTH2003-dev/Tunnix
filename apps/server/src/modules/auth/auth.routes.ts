import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { authMiddleware } from "../../middleware/auth";
import { rateLimit } from "../../middleware/rate-limit";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { verifyTurnstileToken } from "./turnstile.service";
import {
  requestOtp,
  verifyOtp,
  refreshSession,
  logoutSession,
} from "./auth.service";

export const authRoutes = new Hono();

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
