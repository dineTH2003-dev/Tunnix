import { Hono } from "hono";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ApiError, toSuccessResponse } from "../../core/errors";
import { verifyAccessToken } from "../auth/jwt.service";
import { getDb } from "../../core/db/db";
import { writeAuditLog } from "../audit/audit.service";

export const downloadRoutes = new Hono();

const PLATFORM_MAP: Record<string, { filename: string; contentType: string; label: string; platformKey: string }> = {
  "linux-amd64": { filename: "tunnix-linux-amd64", contentType: "application/octet-stream", label: "Linux (x64)", platformKey: "linux" },
  "linux-arm64": { filename: "tunnix-linux-arm64", contentType: "application/octet-stream", label: "Linux (ARM64)", platformKey: "linux" },
  "darwin-amd64": { filename: "tunnix-darwin-amd64", contentType: "application/octet-stream", label: "macOS (Intel)", platformKey: "mac-intel" },
  "darwin-arm64": { filename: "tunnix-darwin-arm64", contentType: "application/octet-stream", label: "macOS (Apple Silicon)", platformKey: "mac" },
  "windows-amd64": { filename: "tunnix-windows-amd64.exe", contentType: "application/vnd.microsoft.portable-executable", label: "Windows (x64)", platformKey: "windows" },
  "linux": { filename: "tunnix-linux-amd64", contentType: "application/octet-stream", label: "Linux (x64)", platformKey: "linux" },
  "windows": { filename: "tunnix-windows-amd64.exe", contentType: "application/vnd.microsoft.portable-executable", label: "Windows (x64)", platformKey: "windows" },
  "mac": { filename: "tunnix-darwin-arm64", contentType: "application/octet-stream", label: "macOS (Apple Silicon)", platformKey: "mac" },
  "mac-intel": { filename: "tunnix-darwin-amd64", contentType: "application/octet-stream", label: "macOS (Intel)", platformKey: "mac-intel" },
};

/** Get platforms available for download */
downloadRoutes.get("/platforms", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const authHeader = c.req.header("Authorization");

  let allowedPlatforms = ["windows", "linux", "mac", "mac-intel"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.substring(7).trim());
      if (payload.role !== "admin") {
        const db = getDb();
        const user = db
          .query<{ allowed_platforms: string }, [string]>("SELECT allowed_platforms FROM users WHERE id = ?")
          .get(payload.sub);
        if (user?.allowed_platforms) {
          allowedPlatforms = user.allowed_platforms.split(",").map((p) => p.trim());
        }
      }
    } catch {
      // Ignore token verification errors for public listing fallback
    }
  }

  const distDir = join(process.cwd(), "../../dist/agents");
  const localDistDir = join(process.cwd(), "dist/agents");

  const platforms = Object.entries(PLATFORM_MAP)
    .filter(([key]) => ["linux-amd64", "darwin-arm64", "windows-amd64"].includes(key))
    .map(([key, config]) => {
      let filePath = join(distDir, config.filename);
      if (!existsSync(filePath)) filePath = join(localDistDir, config.filename);

      const isAllowed = allowedPlatforms.includes(config.platformKey);
      const isCompiled = existsSync(filePath);

      return {
        platform: key,
        label: config.label,
        filename: config.filename,
        available: isCompiled && isAllowed,
      };
    });

  return c.json(toSuccessResponse({ platforms }, requestId));
});

downloadRoutes.get("/:platform", async (c) => {
  const requestId = c.get("requestId" as never) ?? crypto.randomUUID();
  const platform = c.req.param("platform").toLowerCase();
  const config = PLATFORM_MAP[platform];

  if (!config) {
    throw ApiError.badRequest(`Unsupported platform '${platform}'. Available: ${Object.keys(PLATFORM_MAP).join(", ")}`);
  }

  const authHeader = c.req.header("Authorization");
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.substring(7).trim());
      userId = payload.sub;

      if (payload.role !== "admin") {
        const db = getDb();
        const user = db
          .query<{ allowed_platforms: string }, [string]>("SELECT allowed_platforms FROM users WHERE id = ?")
          .get(payload.sub);

        const allowed = (user?.allowed_platforms ?? "windows,linux,mac,mac-intel")
          .split(",")
          .map((p) => p.trim());

        if (!allowed.includes(config.platformKey)) {
          throw new ApiError(403, "FORBIDDEN", `Your account is not authorized to download binaries for platform '${platform}'.`);
        }
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
    }
  }

  const distDir = join(process.cwd(), "../../dist/agents");
  const localDistDir = join(process.cwd(), "dist/agents");
  let filePath = join(distDir, config.filename);

  if (!existsSync(filePath)) {
    filePath = join(localDistDir, config.filename);
  }

  if (!existsSync(filePath)) {
    throw ApiError.notFound(`Binary for platform '${platform}' not compiled on server.`);
  }

  const fileBuffer = readFileSync(filePath);

  writeAuditLog({
    actorUserId: userId,
    action: "agent_binary_downloaded",
    entityType: "agent_binary",
    entityId: platform,
    ipAddress: c.req.header("x-forwarded-for") ?? undefined,
    userAgent: c.req.header("user-agent") ?? undefined,
    metadata: { platform, filename: config.filename, fileSize: fileBuffer.length },
  });

  return c.body(fileBuffer, 200, {
    "Content-Type": config.contentType,
    "Content-Disposition": `attachment; filename="${config.filename}"`,
    "Content-Length": fileBuffer.length.toString(),
  });
});
