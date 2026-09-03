import type { MiddlewareHandler } from "hono";
import { ApiError } from "../core/errors";

type RateLimitRecord = {
  timestamps: number[];
};

const hits = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of hits.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 3600_000);
    if (record.timestamps.length === 0) hits.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Creates an IP sliding-window rate limiting middleware.
 *
 * @param windowMs Time window in milliseconds (e.g. 60_000 for 1 minute)
 * @param maxMax Maximum allowed requests per window
 * @param prefix Unique key prefix for route isolation
 */
export function rateLimit(windowMs: number, maxMax: number, prefix = "global"): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "127.0.0.1";
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // Filter timestamps within current window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxMax) {
      const retryAfterSeconds = Math.ceil((record.timestamps[0] + windowMs - now) / 1000);
      c.header("Retry-After", String(retryAfterSeconds));
      throw new ApiError(429, "RATE_LIMIT_EXCEEDED", `Too many requests. Please try again in ${retryAfterSeconds} seconds.`);
    }

    record.timestamps.push(now);
    await next();
  };
}
