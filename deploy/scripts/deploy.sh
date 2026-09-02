#!/usr/bin/env bash
set -e

echo "🚀 Starting Tunnix Production Deployment..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

echo "1. Pulling latest code & installing workspace dependencies..."
bun install --frozen-lockfile || bun install

echo "2. Running database migrations..."
cd "$ROOT_DIR/apps/server"
bun run src/scripts/migrate.ts

echo "3. Building React Dashboard SPA..."
cd "$ROOT_DIR/apps/client"
bun run build

echo "4. Compiling Go Gateway binary..."
cd "$ROOT_DIR/gateway"
go build -ldflags="-s -w" -o bin/tunnix-gateway ./cmd/gateway

echo "5. Compiling cross-platform Go Agent CLI binaries..."
cd "$ROOT_DIR"
./scripts/build-agents.sh

echo "6. Restarting systemd services..."
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart tunnix-server.service
  sudo systemctl restart tunnix-gateway.service
  sudo systemctl reload nginx
fi

echo "✅ Tunnix Deployment completed successfully!"
