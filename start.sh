#!/usr/bin/env sh
set -e

# На всякий случай: таблицы создадим ещё раз перед запуском.
python -c "from app.db.session import init_db; init_db()"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-10000}"

exec uvicorn app.main:app --host "$HOST" --port "$PORT"
