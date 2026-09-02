# Tunnix Platform Architecture Specification

Tunnix is a self-hosted, developer-first tunneling platform that securely exposes local HTTP servers to the internet via high-concurrency WebSocket multiplexing.

---

## High-Level Architecture Overview

The system consists of four primary components:

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

## Component Responsibilities

### 1. Control Plane Server (`apps/server`)
- **Runtime:** Bun + Hono (TypeScript)
- **Database:** SQLite (WAL mode)
- **Role:** Central authority for user authentication, OTP challenges, agent token issuance, custom subdomain registration, tunnel grant generation, capacity quota enforcement, and security audit logs.
- **Port:** `4310`

### 2. Ingress Gateway (`gateway/`)
- **Runtime:** Go 1.22+ (`gorilla/websocket`)
- **Role:** High-concurrency ingress proxy that routes incoming HTTP requests on wildcard subdomains (`*.tunnix.local`) through active agent WebSocket tunnels.
- **Ports:** `8080` (HTTP Ingress), `9000` (Agent WebSocket Listener)

### 3. Agent CLI (`agent/`)
- **Runtime:** Cross-platform Go binary (`tunnix`)
- **Role:** Lightweight client running on developer machines. Authenticates via agent tokens, requests short-lived tunnel grants, opens WebSocket channels to the Gateway, and forwards HTTP frames to local target ports (`localhost:port`).

### 4. Dashboard SPA (`apps/client`)
- **Runtime:** React 18 + Vite + TypeScript
- **Role:** Web interface for managing agent tokens, reserving custom subdomains, inspecting real-time active tunnels, downloading CLI binaries, and administering users/quotas.

---

## Authentication & Security Model

Tunnix employs a 4-tier token chain:

| Token Type | Issuer | Expiry | Purpose |
| :--- | :--- | :--- | :--- |
| **Access Token** | Control Plane | 15 min | Authenticates Dashboard REST requests |
| **Refresh Token** | Control Plane | 7 days | Obtains fresh Access Tokens |
| **Agent Token** | Control Plane | Persistent | Authenticates CLI agents via `tunnix login` |
| **Tunnel Grant JWT** | Control Plane | 30 min | Authorizes WebSocket tunnel creation on the Gateway |

---

## Data Flow: HTTP Frame Multiplexing

When an external client accesses `http://my-app.tunnix.local`:

1. **Ingress Match:** Gateway extracts `my-app` from the `Host` header and looks up the active WebSocket session in its thread-safe registry.
2. **Request Framing:** Gateway packages the HTTP request into a `RequestFrame` (ID, Method, Path, Headers, Body).
3. **WebSocket Transmission:** Gateway sends the frame over the agent's WebSocket connection.
4. **Local Execution:** Agent receives `RequestFrame`, executes an HTTP request to `http://localhost:<port><path>`, and collects the local response.
5. **Response Framing:** Agent packages the local response into a `ResponseFrame` and returns it over WebSocket.
6. **Client Delivery:** Gateway unpacks the `ResponseFrame` and writes the HTTP response to the external client.
