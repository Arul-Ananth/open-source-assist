#!/usr/bin/env bash
# =============================================================================
# Quick Update Script — pull latest code, rebuild, and restart
# Run as: sudo bash deploy/update.sh
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

echo "[1/4] Pulling latest code..."
git pull origin main

echo "[2/4] Rebuilding containers..."
docker compose -f docker-compose.prod.yml build

echo "[3/4] Restarting services..."
docker compose -f docker-compose.prod.yml up -d

echo "[4/4] Running database migrations..."
docker compose -f docker-compose.prod.yml exec backend uv run alembic upgrade head || \
    echo "Migrations skipped (may already be up to date)."

echo ""
echo "Update complete. Check logs: docker compose -f docker-compose.prod.yml logs -f"
