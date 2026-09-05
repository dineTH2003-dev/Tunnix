FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Copy workspace package files first for better layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/

# Install all deps
RUN bun install --frozen-lockfile

# Copy server source
COPY apps/server ./apps/server

# Build the server
WORKDIR /app/apps/server
RUN bun build src/server.ts --outdir dist --target bun --minify

# --- Runtime image ---
FROM oven/bun:1.2-alpine
WORKDIR /app

# Copy built artefacts from builder
COPY --from=builder /app/apps/server/dist       ./dist
COPY --from=builder /app/apps/server/migrations ./migrations
COPY --from=builder /app/apps/server/scripts    ./scripts
COPY --from=builder /app/apps/server/package.json ./package.json

# Create data directory -- EBS volume is mounted here at runtime (/data/tunnix)
RUN mkdir -p /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4310/health || exit 1

EXPOSE 4310

# Run migrations first, then start the server.
# server.ts does NOT auto-run migrations at startup, so we do it here.
CMD ["sh", "-c", "bun run scripts/migrate.ts && bun run dist/server.js"]
