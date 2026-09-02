# Tunnix — Self-Hosted Developer Tunneling Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-1.1+-black.svg)](https://bun.sh)
[![Go](https://img.shields.io/badge/Go-1.22+-00ADD8.svg)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org)

**Tunnix** is a high-performance, self-hosted developer platform that securely exposes local HTTP servers to the internet using WebSocket frame multiplexing. It features an automated email OTP authentication system, a React SPA dashboard, persistent agent token security, custom subdomain reservations, and an administrative governance suite.

---

## ✨ Features

- 🔒 **Secure Auth Chain**: 2-Step Email OTP login, persistent CLI Agent Tokens, short-lived Access/Refresh JWTs, and 30-min Tunnel Grant JWTs.
- ⚡ **High Concurrency Gateway**: Production Go WebSocket ingress gateway (`gorilla/websocket`) capable of multiplexing thousands of concurrent HTTP requests.
- 💻 **Cross-Platform CLI Agent**: Lightweight Go binary (`tunnix`) for Linux, macOS, and Windows.
- 🎨 **Modern Dark Dashboard**: React 18 + Vite SPA featuring glassmorphic UI, real-time live tunnel monitoring (5s polling), subdomain management, and binary downloads.
- 🛡️ **Operator Governance**: Admin panel for user approvals, custom capacity quota tuning (max tunnels & subdomains), global emergency tunnel disconnects, restricted domain blocking, and security audit logs.
- 📦 **Automated Deployment**: Production Nginx configuration, systemd service units, idempotent deployment runner, and SQLite online backup scripts.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["React Dashboard (SPA)\n:3000 / :443"] -->|REST / JWT| ControlPlane["Server API (Hono / Bun)\n:4310"]
    Agent["Go Agent CLI\ntunnix http <port>"] -->|1. Request Grant| ControlPlane
    ControlPlane -->|2. Issue Grant JWT| Agent
    Agent -->|3. Connect WebSocket| Gateway["Go Ingress Gateway\n:8080 (HTTP) / :9000 (WS)"]
    Gateway -->|4. Introspect Grant| ControlPlane
    Browser["Public Web Client"] -->|HTTP Request (*.tunnix.local)| Gateway
    Gateway <-->|Tunnel Multiplexing| Agent
    Agent <-->|Local HTTP Forward| LocalApp["Developer App\nlocalhost:<port>"]
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- [Bun](https://bun.sh) (1.1+)
- [Go](https://go.dev) (1.22+)

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/dineTH2003-dev/Tunnix.git
cd Tunnix

# Install workspace dependencies & run migrations
bun install
cd apps/server
bun run src/scripts/migrate.ts
```

### 3. Running Services
In separate terminal windows:

```bash
# Terminal 1: Control Plane API (Port 4310)
cd apps/server
bun run dev

# Terminal 2: Ingress Gateway (HTTP 8080, WS 9000)
cd gateway
go run ./cmd/gateway

# Terminal 3: React Dashboard Client (Port 3000)
cd apps/client
bun run dev
```

---

## 💻 CLI Agent Usage

```bash
# 1. Login with your agent token
tunnix login tnx_your_agent_token_here

# 2. Expose a local web app running on port 3000
tunnix http 3000

# 3. Expose port 3000 with a custom reserved subdomain
tunnix http 3000 --subdomain my-custom-app
```

---

## 📂 Repository Structure

```
Tunnix/
├── agent/                # Go Agent CLI source (cmd/agent, internal/client, internal/tunnel)
├── apps/
│   ├── client/           # React 18 + Vite + TypeScript Dashboard SPA
│   └── server/           # Hono + Bun + SQLite Control Plane Server
├── deploy/               # Production Nginx config, systemd service units & backup scripts
├── docs/                 # Platform Architecture, API Reference, Admin Guide & User Manual
├── gateway/              # Production Go Ingress Gateway (cmd/gateway, internal/proxy, internal/router)
└── scripts/              # Cross-platform Agent build & installation scripts (install.sh, install.ps1)
```

---

## 📚 Documentation Links

- [System Architecture Specification](docs/ARCHITECTURE.md)
- [API Endpoints & CLI Reference](docs/API_REFERENCE.md)
- [Administrator & Operator Manual](docs/ADMIN_GUIDE.md)
- [End-to-End User Manual](docs/USER_MANUAL.md)

---

## 📄 License

Distributed under the [MIT License](LICENSE).
