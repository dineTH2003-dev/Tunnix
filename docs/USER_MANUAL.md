# Tunnix User Manual

Welcome to Tunnix! This user manual guides you through creating an account, generating agent tokens, installing the CLI, reserving custom subdomains, and sharing your local web apps securely.

---

## 1. Getting Started & Account Registration

1. Open your browser and navigate to `https://tunnix.local/auth`.
2. Enter your email address and click **Send OTP Code**.
3. Check your email for the 6-digit code (or check console logs in dev mode) and enter it to log in.

---

## 2. Installing the Tunnix CLI

### Linux / macOS:
Run the installer command from your terminal:
```bash
curl -fsSL https://tunnix.local/install.sh | sh
```

### Windows (PowerShell):
Open PowerShell as Administrator and run:
```powershell
iwr -useb https://tunnix.local/install.ps1 | iex
```

Verify installation by running:
```bash
tunnix version
```

---

## 3. Authenticating Your CLI (`tunnix login`)

1. Go to the **Agent Tokens** page on the Dashboard (`/tokens`).
2. Type a friendly name for your machine (e.g. `work-laptop`) and click **Generate Token**.
3. Copy the token string (`tnx_...`).
4. In your terminal, run:
```bash
tunnix login tnx_your_generated_token_here
```

---

## 4. Exposing a Local Port to the Internet

Suppose you are running a local Web application on port `3000`:
```bash
tunnix http 3000
```
**Output:**
```
🚀 Tunnel established successfully!
Public Domain URL : http://rand-12345.tunnix.local
Local Target Port : http://localhost:3000
Session ID       : 832c403b-6df0-44a3-b1aa-5235a3e74f85
Press Ctrl+C to close tunnel.
```

Anyone with the public URL can now access your local web application securely!

---

## 5. Using Reserved Custom Subdomains

1. Go to the **Subdomains** page on the Dashboard (`/subdomains`).
2. Type your desired custom subdomain (e.g. `my-awesome-app`) and click **Reserve Subdomain**.
3. In your terminal, specify your reserved subdomain when starting a tunnel:
```bash
tunnix http 3000 --subdomain my-awesome-app
```
Your app will now always be reachable at `http://my-awesome-app.tunnix.local`!
