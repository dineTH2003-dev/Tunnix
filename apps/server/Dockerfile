# --- Stage 1: Build cross-platform Agent CLI binaries ---
FROM golang:1.23-alpine AS agent-builder
WORKDIR /app
COPY agent ./agent
WORKDIR /app/agent
RUN mkdir -p /dist/agents && \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o /dist/agents/tunnix-linux-amd64 ./cmd/agent && \
    CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w" -o /dist/agents/tunnix-linux-arm64 ./cmd/agent && \
    CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o /dist/agents/tunnix-darwin-amd64 ./cmd/agent && \
    CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o /dist/agents/tunnix-darwin-arm64 ./cmd/agent && \
    CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o /dist/agents/tunnix-windows-amd64.exe ./cmd/agent

# --- Stage 2: Build Bun server ---
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy workspace package files first for better layer caching
COPY package.json bun.lock turbo.json ./
COPY apps/server/package.json ./apps/server/

# Install all deps
RUN bun install --frozen-lockfile || bun install

# Copy server source
COPY apps/server ./apps/server

# Build the server
WORKDIR /app/apps/server
RUN bun build src/server.ts --outdir dist --target bun --minify

# --- Runtime image ---
FROM oven/bun:1-alpine
WORKDIR /app

# Copy node_modules and source
COPY --from=builder /app/node_modules              ./node_modules
COPY --from=builder /app/apps/server/src           ./src
COPY --from=builder /app/apps/server/dist          ./dist
COPY --from=builder /app/apps/server/migrations    ./migrations
COPY --from=builder /app/apps/server/scripts       ./scripts
COPY --from=builder /app/apps/server/package.json  ./package.json

# Copy compiled agent binaries into runtime container image
COPY --from=agent-builder /dist/agents             ./dist/agents
COPY --from=agent-builder /dist/agents             ./apps/server/dist/agents

# Create data directory -- EBS volume is mounted here at runtime (/data/tunnix)
RUN mkdir -p /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4310/health || exit 1

EXPOSE 4310

# Run migrations first, then start the server.
# server.ts does NOT auto-run migrations at startup, so we do it here.
CMD ["sh", "-c", "bun run scripts/migrate.ts && bun run dist/server.js"]
