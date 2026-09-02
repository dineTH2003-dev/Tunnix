import type { MiddlewareHandler } from "hono";
import { ApiError } from "../core/errors";
import { verifyAccessToken } from "../modules/auth/jwt.service";

/**
 * Validates Authorization: Bearer <accessToken> header.
 * Attaches user claims to Hono context variables.
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "UNAUTHORIZED", "Bearer token required in Authorization header.");
  }

  const token = authHeader.substring(7).trim();
  const payload = await verifyAccessToken(token);

  c.set("userId" as never, payload.sub);
  c.set("userEmail" as never, payload.email);
  c.set("userRole" as never, payload.role);
  c.set("userStatus" as never, payload.status);

  await next();
};

/**
 * Ensures user account is active (not pending approval or suspended).
 */
export const activeUserGuard: MiddlewareHandler = async (c, next) => {
  const status = c.get("userStatus" as never);
  if (status === "pending") {
    throw new ApiError(403, "ACCOUNT_PENDING", "Your account is pending administrator approval.");
  }
  if (status === "suspended") {
    throw new ApiError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended.");
  }
  await next();
};

/**
 * Ensures user has admin role.
 */
export const adminGuard: MiddlewareHandler = async (c, next) => {
  const role = c.get("userRole" as never);
  if (role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "Admin access required.");
  }
  await next();
};
