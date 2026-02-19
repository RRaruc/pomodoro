from __future__ import annotations

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    """
    Приводит DATABASE_URL к виду, совместимому с psycopg (v3).

    Поддерживаемые входы:
      - postgres://...
      - postgresql://...
      - postgresql+psycopg2://...
      - postgresql+psycopg://...
    """
    if not url:
        return url

    u = url.strip()

    # Render иногда отдаёт "postgres://", SQLAlchemy ожидает "postgresql://"
    if u.startswith("postgres://"):
        u = "postgresql://" + u[len("postgres://") :]

    # Если драйвер не указан, принудительно выбираем psycopg (v3)
    if u.startswith("postgresql://"):
        u = "postgresql+psycopg://" + u[len("postgresql://") :]

    # Если явно указан psycopg2 — заменяем на psycopg (v3)
    u = u.replace("postgresql+psycopg2://", "postgresql+psycopg://")

    return u


DATABASE_URL = _normalize_database_url(settings.database_url)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
