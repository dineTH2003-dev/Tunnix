#!/usr/bin/env bash
set -e

echo "🚀 Tunnix CLI Installer"

SERVER_URL="${TUNNIX_SERVER_URL:-http://localhost:4310}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

PLATFORM="${OS}-${ARCH}"
DOWNLOAD_URL="${SERVER_URL}/v1/download/${PLATFORM}"
DEST="/usr/local/bin/tunnix"

echo "Downloading Tunnix CLI for $PLATFORM from $DOWNLOAD_URL..."
TMP_FILE="$(mktemp)"

if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$DOWNLOAD_URL" -o "$TMP_FILE"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP_FILE" "$DOWNLOAD_URL"
else
  echo "Error: curl or wget is required."
  exit 1
fi

chmod +x "$TMP_FILE"

if [ -w "/usr/local/bin" ]; then
  mv "$TMP_FILE" "$DEST"
else
  echo "Elevated permissions required to install to /usr/local/bin..."
  sudo mv "$TMP_FILE" "$DEST"
fi

echo "✅ Tunnix CLI successfully installed to $DEST!"
tunnix version
