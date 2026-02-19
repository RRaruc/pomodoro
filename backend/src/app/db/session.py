from __future__ import annotations

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Важно: используем psycopg (psycopg3), а не psycopg2.
# DATABASE_URL в Render должен быть вида:
# postgresql+psycopg://user:pass@host:5432/dbname
DATABASE_URL = os.getenv("DATABASE_URL") or settings.database_url

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Самый простой способ гарантировать наличие таблиц в облаке:
    при старте импортируем модели и вызываем create_all().
    Это не заменяет полноценные миграции, но убирает падения на "UndefinedTable".
    """
    # импорт моделей нужен, чтобы они зарегистрировались в Base.metadata
    from app.db.base import Base  # noqa: WPS433
    from app.db import models  # noqa: F401, WPS433

    Base.metadata.create_all(bind=engine)
