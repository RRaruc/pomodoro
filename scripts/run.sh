#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[i] Created .env from .env.example (edit if needed)"
fi

echo "[i] Starting containers..."
docker compose up -d --build

echo
echo "[ok] Started."
echo "App:        http://localhost:5173"
echo "Backend:    http://localhost:8000/health"
echo "Prometheus: http://localhost:9090"
