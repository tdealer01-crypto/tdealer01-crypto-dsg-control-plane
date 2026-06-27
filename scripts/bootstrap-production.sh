#!/usr/bin/env bash
# bootstrap-production.sh — รันบน Ubuntu/Debian server (รันครั้งเดียวจบ)
# Usage: curl -sSL <url> | bash

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "════════════════════════════════════════"
echo "  DSG Production Bootstrap"
echo "════════════════════════════════════════"

# 1. Install Docker + Redis + Nginx
echo "📦 Installing packages..."
apt update && apt install -y \
  docker.io docker-compose-plugin \
  redis-server nginx certbot python3-certbot-nginx \
  git curl jq

systemctl enable --now docker redis-server nginx

# 2. Add user to docker group
usermod -aG docker $USER

# 3. Configure Redis
sed -i 's/^bind 127.0.0.1.*/bind 0.0.0.0/' /etc/redis/redis.conf
REDIS_PASS=$(openssl rand -base64 32)
sed -i "s/^# requirepass.*/requirepass $REDIS_PASS/" /etc/redis/redis.conf
systemctl restart redis-server

# 4. Clone repo (or copy from local)
REPO_DIR="/opt/dsg-control-plane"
mkdir -p "$REPO_DIR"
cd "$REPO_DIR"

if [ ! -d ".git" ]; then
  git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git .
fi

# 5. Create .env.production
cat > .env.production << EOF
DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
DSG_API_KEY=REPLACE_WITH_ACTUAL_KEY
REDIS_URL=redis://:$REDIS_PASS@localhost:6379
NODE_ENV=production
EOF

# 6. Deploy Docker Compose (Lightpanda + MCP Server)
cd dsg-mcp-server

# Write docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_EOF'
version: '3.8'

services:
  lightpanda:
    image: lightpanda/browser:nightly
    container_name: lightpanda-browser
    restart: unless-stopped
    ports:
      - "127.0.0.1:9222:9222"
    command: >
      serve
      --host 0.0.0.0
      --port 9222
      --log-format pretty
      --log-level info
      --obey-robots
    environment:
      - LIGHTPANDA_DISABLE_TELEMETRY=true
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:9222/json/version"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  mcp-server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: dsg-mcp-server
    restart: unless-stopped
    environment:
      - DSG_API_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
      - DSG_API_KEY=${DSG_API_KEY}
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

networks:
  default:
    name: dsg-net
COMPOSE_EOF

# Build & start
docker compose build
docker compose up -d

# 7. Systemd services
cat > /etc/systemd/system/dsg-mcp-server.service << 'SERVICE_EOF'
[Unit]
Description=DSG MCP Server Stack
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/dsg-control-plane/dsg-mcp-server
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable dsg-mcp-server.service
systemctl start dsg-mcp-server.service

# 8. Nginx reverse proxy (SSL ready)
DOMAIN="dsg.yourdomain.com"  # CHANGE THIS
cat > /etc/nginx/sites-available/dsg << 'NGINX_EOF'
server {
    listen 80;
    server_name dsg.yourdomain.com;

    location /lightpanda/ {
        proxy_pass http://127.0.0.1:9222/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    location /mcp/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/dsg /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 9. Output info
echo ""
echo "════════════════════════════════════════"
echo "  ✅ BOOTSTRAP COMPLETE"
echo "════════════════════════════════════════"
echo ""
echo "📋 NEXT STEPS (manual):"
echo ""
echo "1. Edit /opt/dsg-control-plane/.env.production"
echo "   DSG_API_KEY=your_actual_key_from_vercel"
echo ""
echo "2. Edit /etc/nginx/sites-available/dsg"
echo "   server_name your-domain.com;"
echo ""
echo "3. Get SSL cert:"
echo "   certbot --nginx -d your-domain.com"
echo ""
echo "4. Update Vercel env vars:"
echo "   UPSTASH_REDIS_REST_URL=redis://:$REDIS_PASS@your-server-ip:6379"
echo "   UPSTASH_REDIS_REST_TOKEN=$REDIS_PASS"
echo ""
echo "5. SSH Tunnel for Lightpanda (from Termux):"
echo "   ssh -L 9222:localhost:9222 ubuntu@your-server-ip"
echo ""
echo "🔑 Redis Password: $REDIS_PASS"
echo "📁 Config dir: /opt/dsg-control-plane"
echo "🐳 Containers: docker compose -f /opt/dsg-control-plane/dsg-mcp-server/docker-compose.yml ps"
echo ""
echo "════════════════════════════════════════"