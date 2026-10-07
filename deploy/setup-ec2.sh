#!/usr/bin/env bash
# =============================================================================
# EC2 One-Shot Deployment Script for Open Source Assist
# =============================================================================
# Target OS : Ubuntu 22.04 / 24.04 LTS (Amazon AMI also works with minor tweaks)
# Run as    : sudo bash setup-ec2.sh
#
# Prerequisites:
#   1. An EC2 instance (t3.medium or larger recommended — 2 vCPU, 4 GB RAM)
#   2. Security group allows inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS)
#   3. A domain name with an A record pointing to this EC2's public IP
#   4. This repo cloned to the instance
# =============================================================================

set -euo pipefail

# ── Color helpers ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Must be root ──
[[ $EUID -eq 0 ]] || error "Run this script with sudo."

# ── Prompt for configuration ──
read -rp "Enter your domain name (or leave empty/enter IP for HTTP-only demo): " DOMAIN
DOMAIN="${DOMAIN:-}"

EMAIL=""
if [[ -n "$DOMAIN" && ! "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    read -rp "Enter your email for Let's Encrypt SSL certificate: " EMAIL
fi

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
info "Project directory: $APP_DIR"

# ═══════════════════════════════════════════════════════════════
# 1. SYSTEM PACKAGES
# ═══════════════════════════════════════════════════════════════
info "Updating system packages..."
apt-get update -y && apt-get upgrade -y

info "Installing dependencies..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

# ═══════════════════════════════════════════════════════════════
# 2. INSTALL DOCKER
# ═══════════════════════════════════════════════════════════════
if ! command -v docker &>/dev/null; then
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl enable docker
    systemctl start docker
    # Allow the ubuntu user to run docker without sudo
    usermod -aG docker ubuntu 2>/dev/null || true
else
    info "Docker already installed."
fi

# Ensure Docker Compose plugin is available
docker compose version &>/dev/null || error "Docker Compose plugin not found."

# ═══════════════════════════════════════════════════════════════
# 3. FIREWALL
# ═══════════════════════════════════════════════════════════════
info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ═══════════════════════════════════════════════════════════════
# 4. ENVIRONMENT FILE
# ═══════════════════════════════════════════════════════════════
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    info "Creating .env from .env.example..."
    cp "$APP_DIR/.env.example" "$ENV_FILE"

    # Generate a random JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|^JWT_SECRET_KEY=.*|JWT_SECRET_KEY=$JWT_SECRET|" "$ENV_FILE"

    # Generate a strong Postgres password
    PG_PASS=$(openssl rand -hex 16)
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PG_PASS|" "$ENV_FILE"

    # Set production values
    sed -i "s|^ENVIRONMENT=.*|ENVIRONMENT=production|" "$ENV_FILE"
    sed -i "s|^SERVER_RELOAD=.*|SERVER_RELOAD=false|" "$ENV_FILE"
    sed -i "s|^CORS_ALLOW_ORIGINS=.*|CORS_ALLOW_ORIGINS=https://$DOMAIN|" "$ENV_FILE"
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" "$ENV_FILE"
    sed -i "s|^GITHUB_REDIRECT_URI=.*|GITHUB_REDIRECT_URI=https://$DOMAIN/api/v1/auth/github/callback|" "$ENV_FILE"

    warn "Edit $ENV_FILE to fill in API keys (GEMINI_API_KEY, GITHUB_TOKEN, SMTP, etc.)"
    warn "Then re-run this script or just: cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d --build"
else
    info ".env already exists — keeping it."
fi

# ═══════════════════════════════════════════════════════════════
# 5. BUILD AND START DOCKER CONTAINERS
# ═══════════════════════════════════════════════════════════════
info "Building and starting Docker containers..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml up -d --build

info "Waiting for services to be healthy..."
sleep 10

# Run database migrations
info "Running Alembic database migrations..."
docker compose -f docker-compose.prod.yml exec backend uv run alembic upgrade head || \
    warn "Alembic migration skipped (may already be up to date)."

# ═══════════════════════════════════════════════════════════════
# 6. NGINX REVERSE PROXY
# ═══════════════════════════════════════════════════════════════
SERVER_NAME_VAL="${DOMAIN:-_}"
info "Configuring Nginx reverse proxy for ${SERVER_NAME_VAL}..."

if [[ -n "$DOMAIN" && -n "$EMAIL" && ! "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Domain with SSL setup
    cat > /etc/nginx/sites-available/open-source-assist <<TEMP_CONF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
TEMP_CONF

    ln -sf /etc/nginx/sites-available/open-source-assist /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    mkdir -p /var/www/certbot

    nginx -t && systemctl restart nginx
    info "Obtaining SSL certificate from Let's Encrypt..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || warn "Certbot failed, continuing with HTTP."
    nginx -t && systemctl reload nginx

    info "Setting up automatic SSL renewal..."
    systemctl enable certbot.timer 2>/dev/null || \
        (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && systemctl reload nginx") | crontab -
else
    # HTTP-only setup (suitable for IP address, testing, or cloud demo)
    info "Configuring HTTP-only reverse proxy on port 80..."
    cat > /etc/nginx/sites-available/open-source-assist <<HTTP_CONF
server {
    listen 80;
    server_name _;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_buffering off;
    }
}
HTTP_CONF

    ln -sf /etc/nginx/sites-available/open-source-assist /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx
fi

# ═══════════════════════════════════════════════════════════════
# 7. DONE
# ═══════════════════════════════════════════════════════════════
echo ""
echo "=============================================="
info "Deployment complete!"
echo "=============================================="
echo ""
echo "  Domain:    https://$DOMAIN"
echo "  API Docs:  https://$DOMAIN/docs"
echo "  Health:    https://$DOMAIN/health"
echo ""
echo "  Useful commands:"
echo "    cd $APP_DIR"
echo "    docker compose -f docker-compose.prod.yml logs -f        # view logs"
echo "    docker compose -f docker-compose.prod.yml restart        # restart all"
echo "    docker compose -f docker-compose.prod.yml down           # stop all"
echo "    docker compose -f docker-compose.prod.yml up -d --build  # rebuild & start"
echo ""
warn "Remember to fill in API keys in $APP_DIR/.env if you haven't already."
