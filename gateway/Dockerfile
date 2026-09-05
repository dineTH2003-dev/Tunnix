FROM golang:1.23-alpine AS builder
WORKDIR /app

# Download deps first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy all source
COPY . ./

# Build -- module is tunnix/gateway, main package is ./cmd/gateway
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o bin/tunnix-gateway ./cmd/gateway

# --- Runtime image ---
FROM alpine:3.21
RUN apk add --no-cache ca-certificates tzdata wget

WORKDIR /app
COPY --from=builder /app/bin/tunnix-gateway /usr/local/bin/tunnix-gateway

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

# 8080 -- HTTP tunnel ingress
# 9000 -- Agent WebSocket control plane
EXPOSE 8080 9000

CMD ["/usr/local/bin/tunnix-gateway"]
