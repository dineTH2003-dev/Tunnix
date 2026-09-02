#!/usr/bin/env bash
set -e

echo "📦 Creating Tunnix SQLite Database Backup..."

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_PATH="${TUNNIX_DB_PATH:-$ROOT_DIR/apps/server/tunnix.db}"
BACKUP_DIR="${TUNNIX_BACKUP_DIR:-$ROOT_DIR/backups}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEST_FILE="$BACKUP_DIR/tunnix_backup_$TIMESTAMP.db"

if [ ! -f "$DB_PATH" ]; then
  echo "Error: Database file not found at $DB_PATH"
  exit 1
fi

if command -v sqlite3 >/dev/null 2>&1; then
  echo "Performing safe online backup via sqlite3..."
  sqlite3 "$DB_PATH" ".backup '$DEST_FILE'"
else
  echo "sqlite3 CLI missing, performing file copy..."
  cp "$DB_PATH" "$DEST_FILE"
fi

gzip "$DEST_FILE"

echo "✅ Backup created: ${DEST_FILE}.gz"
echo "Cleaning up backups older than 30 days..."
find "$BACKUP_DIR" -type f -name "tunnix_backup_*.db.gz" -mtime +30 -delete
