#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

cp -n .env.example .env >/dev/null 2>&1 || true

docker compose up --build
