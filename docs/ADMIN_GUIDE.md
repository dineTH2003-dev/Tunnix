# Tunnix Administrator & Operator Manual

This guide describes how to deploy, operate, manage, and back up a production instance of Tunnix.

---

## Deployment Prerequisites

- **OS:** Linux (Ubuntu 22.04 LTS or Debian 12 recommended)
- **Runtimes:** Bun (1.1+), Go (1.22+), Node.js / Nginx
- **Domain:** Domain name with wildcard DNS pointing to your server (e.g. `*.tunnix.local` & `tunnix.local`)
- **Certificates:** Wildcard TLS Certificate via Let's Encrypt / Certbot

---

## Production Setup Workflow

### 1. Code Base & Environment Configuration
```bash
git clone https://github.com/dineTH2003-dev/Tunnix.git /var/www/tunnix
cd /var/www/tunnix

# Configure Server Environment
cp apps/server/.env.example apps/server/.env
# Edit JWT_SECRET, BREVO_API_KEY, and WILDCARD_DOMAIN in apps/server/.env
```

### 2. Run Database Migrations
```bash
cd /var/www/tunnix/apps/server
bun run src/scripts/migrate.ts
```

### 3. Build Web Dashboard & Agent Binaries
```bash
# Build React Dashboard SPA
cd /var/www/tunnix/apps/client
bun install && bun run build

# Build Gateway Binary
cd /var/www/tunnix/gateway
go build -o bin/tunnix-gateway ./cmd/gateway

# Compile Cross-Platform Agent Binaries
cd /var/www/tunnix
./scripts/build-agents.sh
```

---

## Nginx & systemd Service Configuration

### 1. Nginx Reverse Proxy Setup
```bash
sudo cp deploy/nginx/tunnix.conf /etc/nginx/sites-available/tunnix.conf
sudo ln -s /etc/nginx/sites-available/tunnix.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Installing systemd Services
```bash
sudo cp deploy/systemd/tunnix-server.service /etc/systemd/system/
sudo cp deploy/systemd/tunnix-gateway.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now tunnix-server tunnix-gateway
```

---

## Database Backups & Maintenance

Run the included online SQLite backup script:
```bash
chmod +x deploy/scripts/backup-db.sh
./deploy/scripts/backup-db.sh
```

Configure a daily cron job:
```cron
0 2 * * * /var/www/tunnix/deploy/scripts/backup-db.sh >> /var/log/tunnix-backup.log 2>&1
```

---

## Troubleshooting & Emergency Controls

- **View Server Logs:** `journalctl -u tunnix-server.service -f`
- **View Gateway Logs:** `journalctl -u tunnix-gateway.service -f`
- **Force Disconnect Active Tunnel:** Log into the Admin Dashboard (`/admin/tunnels`) or issue a DELETE request to `/v1/admin/tunnels/:sessionId/disconnect`.
- **Block Malicious Subdomain:** Add pattern in Admin Console under `/admin/subdomains`.
