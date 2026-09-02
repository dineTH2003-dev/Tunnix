import type { MiddlewareHandler } from "hono";
import { logInfo } from "../core/logging";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.set("requestId" as never, requestId);
  c.header("x-request-id", requestId);

  const start = Date.now();
  await next();

  logInfo("http", `${c.req.method} ${c.req.path}`, {
    requestId,
    status: c.res.status,
    ms: Date.now() - start,
  });
};
