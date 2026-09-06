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

function resolveAgentBinary(filename: string): string | null {
  const candidates = [
    join(process.cwd(), "../../dist/agents", filename),
    join(process.cwd(), "../dist/agents", filename),
    join(process.cwd(), "dist/agents", filename),
    join(process.cwd(), "apps/server/dist/agents", filename),
    join(__dirname, "../../../../../dist/agents", filename),
    join(__dirname, "../../../../dist/agents", filename),
    join("/data/agents", filename),
    join("/data/tunnix/agents", filename),
    join("/data", filename),
    join("/app/dist/agents", filename),
    join(process.cwd(), "agent/bin", filename),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/** Resolve the public base URL for install scripts, with override via ?baseUrl= query param */
function resolveScriptBaseUrl(c: { req: { header: (k: string) => string | undefined; query: (k: string) => string | undefined } }): string {
  // Allow frontend to pass the correct public URL explicitly
  const queryBase = c.req.query("baseUrl");
  if (queryBase) {
    try {
      const u = new URL(queryBase);
      return u.origin; // sanitise: only keep origin
    } catch {}
  }
  // X-Forwarded-Host is set by reverse proxies (nginx, AWS ALB, etc.)
  const fwdHost = c.req.header("x-forwarded-host");
  const fwdProto = c.req.header("x-forwarded-proto") || "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;
  // Fallback: use the Host header (may be localhost:4310 behind Vite proxy)
  const host = c.req.header("host") || "localhost:4310";
  const protocol = c.req.header("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

/** Serve automated PowerShell installer script for Windows */
downloadRoutes.get("/install.ps1", (c) => {
  const baseUrl = resolveScriptBaseUrl(c as never);

  const psScript = `$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

$installDir = "$env:LOCALAPPDATA\\Programs\\Tunnix"
if (!(Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
}
$exePath = "$installDir\\tunnix.exe"

Write-Host "⚡ Downloading Tunnix Agent CLI for Windows..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "${baseUrl}/v1/download/windows" -OutFile $exePath -UseBasicParsing

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$installDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$installDir", "User")
    $env:Path = "$env:Path;$installDir"
    Write-Host " Added $installDir to User PATH." -ForegroundColor Gray
}

if (Test-Path $exePath) {
    Write-Host "✅ Tunnix CLI successfully installed to $exePath!" -ForegroundColor Green
    & "$exePath" version
} else {
    Write-Host "❌ Download completed but tunnix.exe not found at $exePath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "👉 Quick Start:" -ForegroundColor Yellow
Write-Host "  1. Open a new terminal window"
Write-Host "  2. tunnix login <agent-token>"
Write-Host "  3. tunnix http 3000"
`;

  return c.text(psScript, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

/** Serve automated Shell installer script for Linux & macOS */
downloadRoutes.get("/install.sh", (c) => {
  const baseUrl = resolveScriptBaseUrl(c as never);

  const shScript = `#!/bin/sh
set -e

echo "⚡ Detecting system architecture..."
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m | tr '[:upper:]' '[:lower:]')"

PLATFORM=""

if [ "$OS" = "darwin" ]; then
    case "$ARCH" in
        arm64|aarch64)
            PLATFORM="darwin-arm64"
            ;;
        x86_64|amd64)
            PLATFORM="darwin-amd64"
            ;;
        *)
            PLATFORM="darwin-arm64"
            ;;
    esac
elif [ "$OS" = "linux" ]; then
    case "$ARCH" in
        arm64|aarch64)
            PLATFORM="linux-arm64"
            ;;
        x86_64|amd64)
            PLATFORM="linux-amd64"
            ;;
        *)
            PLATFORM="linux-amd64"
            ;;
    esac
else
    echo "❌ Unsupported operating system: $OS"
    exit 1
fi

echo "📥 Downloading Tunnix CLI for $OS ($ARCH) from ${baseUrl}..."

TARGET_FILE="/usr/local/bin/tunnix"
TMP_FILE="/tmp/tunnix_install_$$"

# Download to temp location first
curl -fsSL "${baseUrl}/v1/download/$PLATFORM" -o "$TMP_FILE"
chmod +x "$TMP_FILE"

# Determine install location
if [ "$(id -u)" -eq 0 ]; then
    mv -f "$TMP_FILE" "$TARGET_FILE"
    INSTALLED_PATH="$TARGET_FILE"
elif [ -w "/usr/local/bin" ]; then
    mv -f "$TMP_FILE" "$TARGET_FILE"
    INSTALLED_PATH="$TARGET_FILE"
elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo mv -f "$TMP_FILE" "$TARGET_FILE"
    INSTALLED_PATH="$TARGET_FILE"
else
    # Fallback to user local bin
    USER_BIN="$HOME/.local/bin"
    mkdir -p "$USER_BIN"
    mv -f "$TMP_FILE" "$USER_BIN/tunnix"
    INSTALLED_PATH="$USER_BIN/tunnix"

    # Ensure in PATH
    case ":$PATH:" in
        *":$USER_BIN:"*) ;;
        *)
            export PATH="$USER_BIN:$PATH"
            for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
                if [ -f "$rc" ] && ! grep -q "$USER_BIN" "$rc"; then
                    echo "export PATH=\"\\$HOME/.local/bin:\\$PATH\"" >> "$rc"
                fi
            done
            echo "ℹ️  Added $USER_BIN to PATH in your shell profiles."
            ;;
    esac
fi

if [ -x "$INSTALLED_PATH" ]; then
    echo "✅ Tunnix CLI successfully installed to $INSTALLED_PATH!"
    "$INSTALLED_PATH" version || true
else
    echo "❌ Installation failed."
    exit 1
fi

echo ""
echo "👉 Quick Start:"
echo "  1. tunnix login <agent-token>"
echo "  2. tunnix http 3000"
`;

  return c.text(shScript, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

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

  const platforms = Object.entries(PLATFORM_MAP)
    .filter(([key]) => ["linux-amd64", "darwin-arm64", "windows-amd64"].includes(key))
    .map(([key, config]) => {
      const filePath = resolveAgentBinary(config.filename);
      const isAllowed = allowedPlatforms.includes(config.platformKey);
      const isCompiled = filePath !== null;

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
    throw new ApiError(400, "BAD_REQUEST", `Unsupported platform '${platform}'. Available: ${Object.keys(PLATFORM_MAP).join(", ")}`);
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

  const filePath = resolveAgentBinary(config.filename);
  if (!filePath) {
    throw new ApiError(404, "NOT_FOUND", `Binary for platform '${platform}' not compiled on server.`);
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
