#!/usr/bin/env bash
set -e

echo "🔨 Building Tunnix Agent binaries for cross-platform distribution..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENT_DIR="$ROOT_DIR/agent"
DIST_DIR="$ROOT_DIR/dist/agents"

mkdir -p "$DIST_DIR"

cd "$AGENT_DIR"

PLATFORMS=(
  "linux/amd64/tunnix-linux-amd64"
  "linux/arm64/tunnix-linux-arm64"
  "darwin/amd64/tunnix-darwin-amd64"
  "darwin/arm64/tunnix-darwin-arm64"
  "windows/amd64/tunnix-windows-amd64.exe"
)

for target in "${PLATFORMS[@]}"; do
  IFS="/" read -r GOOS GOARCH OUTNAME <<< "$target"
  echo "  --> Compiling $GOOS/$GOARCH..."
  GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="-s -w" -o "$DIST_DIR/$OUTNAME" ./cmd/agent
done

echo "✅ All agent binaries built successfully in $DIST_DIR:"
ls -lh "$DIST_DIR"
