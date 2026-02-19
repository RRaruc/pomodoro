from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest
from sqlalchemy import text

from app.api.v1.auth import router as auth_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.settings import router as settings_router
from app.api.v1.tasks import router as tasks_router
from app.db.session import SessionLocal


app = FastAPI(title="Pomodoro API", version="0.6.1")

# В проде фронт и API предполагаются на одном домене (same-origin).
# Для простоты оставляем permissive CORS без credentials: Bearer-токен работает без cookie.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUESTS = Counter("http_requests_total", "Total HTTP requests", ["path", "method"])


@app.middleware("http")
async def count_requests(request, call_next):
    response = await call_next(request)
    REQUESTS.labels(path=request.url.path, method=request.method).inc()
    return response


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get("/ready", include_in_schema=False)
def ready():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return Response(
            content='{"status":"not_ready"}',
            media_type="application/json",
            status_code=503,
        )


@app.get("/metrics", include_in_schema=False)
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ----- API routers -----
app.include_router(auth_router, prefix="/v1")
app.include_router(sessions_router, prefix="/v1")
app.include_router(analytics_router, prefix="/v1")
app.include_router(settings_router, prefix="/v1")
app.include_router(tasks_router, prefix="/v1")


# ----- Frontend static (монолитный деплой) -----
def detect_frontend_dir() -> Path | None:
    """
    Ищем фронтенд так, чтобы работать в двух режимах:
    1) Render / monolith: фронт лежит в /app/frontend
    2) Локальный docker-compose: фронт раздаёт отдельный nginx-контейнер и в backend контейнере его нет
    """
    env = os.getenv("FRONTEND_DIR")
    if env:
        p = Path(env)
        if (p / "index.html").exists():
            return p

    # Самый типичный путь для монолитного Dockerfile в корне репозитория
    p = Path("/app/frontend")
    if (p / "index.html").exists():
        return p

    # На всякий случай проверяем соседние варианты
    for parent in Path(__file__).resolve().parents:
        cand = parent / "frontend"
        if (cand / "index.html").exists():
            return cand

    return None


FRONTEND_DIR = detect_frontend_dir()
FRONTEND_INDEX = (FRONTEND_DIR / "index.html") if FRONTEND_DIR else None
FRONTEND_SRC_DIR = (FRONTEND_DIR / "src") if FRONTEND_DIR else None

if FRONTEND_SRC_DIR and FRONTEND_SRC_DIR.exists():
    # чтобы работали ссылки вида /src/css/app.css и /src/js/app.js
    app.mount("/src", StaticFiles(directory=str(FRONTEND_SRC_DIR)), name="frontend-src")


def serve_index() -> Response:
    if FRONTEND_INDEX and FRONTEND_INDEX.exists():
        return FileResponse(str(FRONTEND_INDEX), media_type="text/html; charset=utf-8")
    return Response(
        content="frontend is not bundled with backend in this runtime",
        media_type="text/plain; charset=utf-8",
        status_code=404,
    )


@app.get("/", include_in_schema=False)
def frontend_root():
    return serve_index()


# SPA fallback: прямые переходы на /something должны возвращать index.html,
# но API и служебные эндпоинты не трогаем.
@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str):
    top = (full_path.split("/", 1)[0] or "").lower()
    if top in {"v1", "metrics", "health", "ready", "src"}:
        raise HTTPException(status_code=404, detail="Not Found")
    return serve_index()
