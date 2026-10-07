#!/usr/bin/env bash
# =============================================================================
# COMPLETE UBUNTU EC2 SETUP — Copy-paste these blocks in order
# =============================================================================
# Run after SSH-ing into a fresh Ubuntu 22.04/24.04 EC2 instance:
#   ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
# =============================================================================

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 1: UPDATE SYSTEM                                   ║
# ╚═══════════════════════════════════════════════════════════╝

sudo apt-get update -y && sudo apt-get upgrade -y

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 2: INSTALL DOCKER                                  ║
# ╚═══════════════════════════════════════════════════════════╝

# Install Docker using the official script
curl -fsSL https://get.docker.com | sudo bash

# Let your user run docker without sudo
sudo usermod -aG docker $USER

# Apply group change (or log out and back in)
newgrp docker

# Verify
docker --version
docker compose version

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 3: INSTALL NGINX & CERTBOT                        ║
# ╚═══════════════════════════════════════════════════════════╝

sudo apt-get install -y nginx certbot python3-certbot-nginx

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 4: CONFIGURE FIREWALL                             ║
# ╚═══════════════════════════════════════════════════════════╝

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 5: CLONE THE REPOSITORY                           ║
# ╚═══════════════════════════════════════════════════════════╝

cd ~
git clone https://github.com/YOUR_ORG/open-source-assist.git
cd open-source-assist

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 6: CREATE THE .env FILE                           ║
# ╚═══════════════════════════════════════════════════════════╝

cp .env.example .env

# Generate secure secrets
echo ""
echo "=== Use these generated secrets in your .env ==="
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
echo "================================================="
echo ""

# Edit the .env file — fill in ALL values
nano .env

# ── IMPORTANT: Change these values in .env ──
# POSTGRES_PASSWORD=<paste-generated-password>
# JWT_SECRET_KEY=<paste-generated-secret>
# ENVIRONMENT=production
# SERVER_RELOAD=false
# CORS_ALLOW_ORIGINS=https://yourdomain.com
# FRONTEND_URL=https://yourdomain.com
# GITHUB_REDIRECT_URI=https://yourdomain.com/api/v1/auth/github/callback
# GEMINI_API_KEY=<your-key>
# GITHUB_TOKEN=<your-token>
# GITHUB_CLIENT_ID=<your-oauth-client-id>
# GITHUB_CLIENT_SECRET=<your-oauth-client-secret>
# SMTP_USERNAME=<your-email>
# SMTP_PASSWORD=<your-app-password>
# MAIL_FROM=<your-email>

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 7: BUILD & START ALL CONTAINERS                   ║
# ╚═══════════════════════════════════════════════════════════╝

docker compose -f docker-compose.prod.yml up -d --build

# Wait for containers to be ready
sleep 15

# Check all 4 containers are running
docker compose -f docker-compose.prod.yml ps

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 8: RUN DATABASE MIGRATIONS                        ║
# ╚═══════════════════════════════════════════════════════════╝

docker compose -f docker-compose.prod.yml exec backend uv run alembic upgrade head

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 9: TEST WITHOUT DOMAIN (HTTP on port 3000)        ║
# ╚═══════════════════════════════════════════════════════════╝

# Quick test — should return {"status":"healthy","service":"open-source-assist-backend"}
curl http://localhost:8000/health

# Frontend test — should return HTML
curl -s http://localhost:3000 | head -5

# If both work, your app is running! Now set up the domain + SSL.

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 10: CONFIGURE NGINX REVERSE PROXY                 ║
# ╚═══════════════════════════════════════════════════════════╝

# Replace YOUR_DOMAIN below with your actual domain
export DOMAIN="yourdomain.com"

sudo tee /etc/nginx/sites-available/open-source-assist > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
EOF

# Enable the site and remove default
sudo ln -sf /etc/nginx/sites-available/open-source-assist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart nginx
sudo nginx -t
sudo systemctl restart nginx

# Verify — visit http://yourdomain.com in your browser (should load the app)

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 11: GET SSL CERTIFICATE (HTTPS)                   ║
# ╚═══════════════════════════════════════════════════════════╝

# Replace with your actual email and domain
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m your-email@gmail.com --redirect

# Verify SSL auto-renewal
sudo certbot renew --dry-run

# ╔═══════════════════════════════════════════════════════════╗
# ║  STEP 12: SET UP AUTO-RENEWAL CRON                      ║
# ╚═══════════════════════════════════════════════════════════╝

# Certbot timer is usually auto-enabled, but just in case:
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# ╔═══════════════════════════════════════════════════════════╗
# ║  DONE! YOUR APP IS LIVE AT https://yourdomain.com       ║
# ╚═══════════════════════════════════════════════════════════╝

# ── Useful Commands ──────────────────────────────────────────

# View all logs
docker compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f postgres
docker compose -f docker-compose.prod.yml logs -f qdrant

# Restart everything
docker compose -f docker-compose.prod.yml restart

# Stop everything
docker compose -f docker-compose.prod.yml down

# Rebuild after code changes
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec backend uv run alembic upgrade head

# Check container status
docker compose -f docker-compose.prod.yml ps

# Access PostgreSQL CLI
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d open_source_assist

# Check disk usage
docker system df

# Clean up unused Docker images
docker image prune -f
