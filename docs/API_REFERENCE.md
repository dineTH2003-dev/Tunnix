# Tunnix API & CLI Reference Manual

This document details all available HTTP REST endpoints on the Tunnix Control Plane Server (`http://localhost:4310/v1`) and CLI commands.

---

## Authentication Endpoints (`/v1/auth`)

### `POST /v1/auth/request-otp`
Requests a 6-digit email OTP for login or registration.
- **Body:** `{ "email": "user@domain.com", "turnstileToken": "optional" }`
- **Response (201):** `{ "success": true, "data": { "challengeId": "uuid" } }`

### `POST /v1/auth/verify-otp`
Verifies OTP code and returns access and refresh tokens.
- **Body:** `{ "challengeId": "uuid", "code": "123456" }`
- **Response (200):** `{ "success": true, "data": { "accessToken": "jwt", "refreshToken": "jwt", "user": { ... } } }`

### `GET /v1/auth/me`
Retrieves current authenticated user profile.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200):** User metadata object.

---

## Agent Token Endpoints (`/v1/agent-tokens`)

### `POST /v1/agent-tokens`
Generates a new persistent agent token for CLI login.
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `{ "name": "macbook-pro" }`
- **Response (201):** `{ "success": true, "data": { "id": "uuid", "name": "macbook-pro", "token": "tnx_..." } }`

### `GET /v1/agent-tokens`
Lists user active agent tokens.
- **Response (200):** Array of agent token summaries.

### `DELETE /v1/agent-tokens/:id`
Revokes an agent token.

---

## Subdomain Endpoints (`/v1/subdomains`)

### `POST /v1/subdomains`
Reserves a custom subdomain on `tunnix.local`.
- **Body:** `{ "subdomain": "my-app" }`

### `GET /v1/subdomains`
Lists user's reserved custom subdomains.

### `DELETE /v1/subdomains/:id`
Releases a reserved subdomain.

---

## Tunnel Session Endpoints (`/v1/tunnel/sessions`)

### `POST /v1/tunnel/sessions`
Generates a Tunnel Grant JWT for the CLI agent.
- **Headers:** `Authorization: Bearer <agentToken>`
- **Body:** `{ "subdomain": "optional", "localPort": 3000 }`
- **Response (201):** `{ "success": true, "data": { "grantToken": "jwt", "publicUrl": "http://my-app.tunnix.local", "gatewayWsUrl": "ws://localhost:9000/v1/tunnel/ws" } }`

---

## Binary Download Endpoint (`/v1/download`)

### `GET /v1/download/:platform`
Downloads compiled Go agent binary for specified OS/Arch.
- **Platforms:** `linux-amd64`, `linux-arm64`, `darwin-amd64`, `darwin-arm64`, `windows-amd64`

---

## Tunnix CLI Reference (`tunnix`)

### `tunnix login <agent-token>`
Stores agent credentials locally in `~/.tunnix/config.json`.

### `tunnix http <port> [--subdomain <subdomain>]`
Establishes a tunnel exposing local port to internet.
- **Example:** `tunnix http 3000 --subdomain my-api`

### `tunnix version`
Displays current CLI binary version.
