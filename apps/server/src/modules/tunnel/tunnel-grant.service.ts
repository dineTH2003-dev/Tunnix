import { SignJWT, jwtVerify } from "jose";
import { env } from "../../core/env";
import { ApiError } from "../../core/errors";

const encoder = new TextEncoder();

export type TunnelGrantPayload = {
  jti: string; // Grant Unique ID
  sid: string; // Tunnel Session ID
  uid: string; // User ID
  sdn: string; // Subdomain name
  prt: number; // Local target port
};

/**
 * Sign a short-lived (30-min) Tunnel Grant JWT for agent WebSocket auth.
 */
export async function signTunnelGrant(payload: TunnelGrantPayload): Promise<string> {
  const secret = encoder.encode(env.TUNNEL_GRANT_SECRET);
  return new SignJWT({
    sid: payload.sid,
    uid: payload.uid,
    sdn: payload.sdn,
    prt: payload.prt,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.APP_NAME)
    .setJti(payload.jti)
    .setSubject(payload.uid)
    .setIssuedAt()
    .setExpirationTime(`${env.TUNNEL_GRANT_TTL_SECONDS}s`)
    .sign(secret);
}

/**
 * Verify a Tunnel Grant JWT.
 */
export async function verifyTunnelGrant(token: string): Promise<TunnelGrantPayload> {
  try {
    const secret = encoder.encode(env.TUNNEL_GRANT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: env.APP_NAME,
    });

    if (!payload.jti || !payload.sid || !payload.uid || !payload.sdn || !payload.prt) {
      throw new ApiError(401, "INVALID_GRANT", "Tunnel grant payload missing required claims.");
    }

    return {
      jti: payload.jti,
      sid: payload.sid as string,
      uid: payload.uid as string,
      sdn: payload.sdn as string,
      prt: Number(payload.prt),
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired tunnel grant.");
  }
}
