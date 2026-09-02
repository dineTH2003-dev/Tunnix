import { Hono } from "hono";
import { getDb } from "../../core/db/db";
import { toSuccessResponse } from "../../core/errors";

export const healthRoutes = new Hono();

healthRoutes.get("/", (c) => {
  const requestId = c.get("requestId") ?? "health";

  // Ping the database
  let dbStatus = "ok";
  try {
    const db = getDb();
    db.query("SELECT 1").get();
  } catch {
    dbStatus = "error";
  }

  return c.json(
    toSuccessResponse(
      {
        status: dbStatus === "ok" ? "ok" : "degraded",
        db: dbStatus,
        ts: new Date().toISOString(),
      },
      requestId,
    ),
  );
});
