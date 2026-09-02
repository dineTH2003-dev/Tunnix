import { Hono } from "hono";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { ApiError } from "../../core/errors";

export const downloadRoutes = new Hono();

const PLATFORM_MAP: Record<string, { filename: string; contentType: string }> = {
  "linux-amd64": { filename: "tunnix-linux-amd64", contentType: "application/octet-stream" },
  "linux-arm64": { filename: "tunnix-linux-arm64", contentType: "application/octet-stream" },
  "darwin-amd64": { filename: "tunnix-darwin-amd64", contentType: "application/octet-stream" },
  "darwin-arm64": { filename: "tunnix-darwin-arm64", contentType: "application/octet-stream" },
  "windows-amd64": { filename: "tunnix-windows-amd64.exe", contentType: "application/vnd.microsoft.portable-executable" },
};

downloadRoutes.get("/:platform", (c) => {
  const platform = c.req.param("platform").toLowerCase();
  const config = PLATFORM_MAP[platform];

  if (!config) {
    throw ApiError.badRequest(`Unsupported platform '${platform}'. Available: ${Object.keys(PLATFORM_MAP).join(", ")}`);
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

  return c.body(fileBuffer, 200, {
    "Content-Type": config.contentType,
    "Content-Disposition": `attachment; filename="${config.filename}"`,
    "Content-Length": fileBuffer.length.toString(),
  });
});
