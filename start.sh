#!/usr/bin/env sh
set -e

# Render всегда выставляет PORT. Локально можно не выставлять — будет 8000.
: "${PORT:=8000}"

# Миграции: выполняем, если есть alembic.ini (так безопаснее для разных состояний репо).
if [ -f /app/backend/alembic.ini ]; then
  echo "Running migrations..."
  alembic -c /app/backend/alembic.ini upgrade head || true
fi

echo "Starting uvicorn on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
