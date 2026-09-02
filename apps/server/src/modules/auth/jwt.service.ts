import { SignJWT, jwtVerify } from "jose";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";

const encoder = new TextEncoder();

export type AccessTokenPayload = {
  sub: string; // userId
  email: string;
  role: "user" | "admin";
  status: "pending" | "active" | "suspended";
  sid: string; // sessionId
};

export type RefreshTokenPayload = {
  sub: string; // userId
  sid: string; // sessionId
  type: "refresh";
};

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  const secret = encoder.encode(env.JWT_ACCESS_SECRET);
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    status: payload.status,
    sid: payload.sid,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.APP_NAME)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  const secret = encoder.encode(env.JWT_REFRESH_SECRET);
  return new SignJWT({
    sid: payload.sid,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.APP_NAME)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const secret = encoder.encode(env.JWT_ACCESS_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.APP_NAME,
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as "user" | "admin",
      status: payload.status as "pending" | "active" | "suspended",
      sid: payload.sid as string,
    };
  } catch (err) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired access token.");
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const secret = encoder.encode(env.JWT_REFRESH_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.APP_NAME,
    });

    if (payload.type !== "refresh") {
      throw new ApiError(401, "INVALID_TOKEN", "Token is not a refresh token.");
    }

    return {
      sub: payload.sub as string,
      sid: payload.sid as string,
      type: "refresh",
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired refresh token.");
  }
}
