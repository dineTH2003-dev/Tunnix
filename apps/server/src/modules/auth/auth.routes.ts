import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
import { verifyTurnstileToken } from "./turnstile.service";
import {
  requestOtp,
  verifyOtp,
  refreshSession,
  logoutSession,
} from "./auth.service";

export const authRoutes = new Hono();

// POST /v1/auth/request-otp
authRoutes.post("/request-otp", async (c) => {
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

// POST /v1/auth/verify-otp
authRoutes.post("/verify-otp", async (c) => {
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
});

// GET /v1/auth/me
authRoutes.get("/me", authMiddleware, async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  return c.json(
    toSuccessResponse(
      {
        id: c.get("userId" as never),
        email: c.get("userEmail" as never),
        role: c.get("userRole" as never),
        status: c.get("userStatus" as never),
      },
      requestId,
    ),
    200,
  );
});
