import { Hono } from "hono";
import { activeUserGuard, authMiddleware } from "../../middleware/auth";
import { toSuccessResponse, ApiError } from "../../core/errors";
import {
  reserveSubdomain,
  listUserSubdomains,
  releaseSubdomain,
} from "./subdomain.service";

export const subdomainRoutes = new Hono();

subdomainRoutes.use("*", authMiddleware, activeUserGuard);

// GET /v1/subdomains
subdomainRoutes.get("/", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);

  const subdomains = listUserSubdomains(userId);
  return c.json(toSuccessResponse(subdomains, requestId), 200);
});

// POST /v1/subdomains
subdomainRoutes.post("/", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);
  const body = await c.req.json().catch(() => ({}));

  const { subdomain } = body;
  if (!subdomain || typeof subdomain !== "string") {
    throw new ApiError(400, "INVALID_INPUT", "Subdomain name is required.");
  }

  const result = reserveSubdomain(userId, subdomain);
  return c.json(toSuccessResponse(result, requestId), 201);
});

// DELETE /v1/subdomains/:id
subdomainRoutes.delete("/:id", (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const userId = c.get("userId" as never);
  const subdomainId = c.req.param("id");

  releaseSubdomain(userId, subdomainId);
  return c.json(toSuccessResponse({ released: true, id: subdomainId }, requestId), 200);
});
