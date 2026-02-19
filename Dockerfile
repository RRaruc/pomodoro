FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend/src

COPY backend/pyproject.toml /app/backend/pyproject.toml

RUN pip install --no-cache-dir \
    fastapi \
    "uvicorn[standard]" \
    prometheus-client \
    "SQLAlchemy>=2.0" \
    "psycopg[binary]>=3.1" \
    "alembic>=1.13" \
    "pydantic-settings>=2.0" \
    "email-validator>=2.0" \
    "python-jose[cryptography]>=3.3" \
    "passlib[bcrypt]>=1.7" \
    "bcrypt<4.0"


COPY backend/src /app/backend/src
COPY backend/migrations /app/backend/migrations

COPY frontend /app/frontend

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000
CMD ["/app/start.sh"]
