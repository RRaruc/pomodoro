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
from app.db.session import SessionLocal, init_db

app = FastAPI(title="Pomodoro API", version="0.6.1")

# В проде фронт и API на одном домене, но для надёжности оставляем permissive CORS без credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

REQUESTS = Counter("http_requests_total", "Total HTTP requests", ["path", "method"])


@app.on_event("startup")
def _startup():
    # Гарантируем, что таблицы существуют
    init_db()


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
        return Response(content='{"status":"not_ready"}', media_type="application/json", status_code=503)


@app.get("/metrics", include_in_schema=False)
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


# ----- API routers -----
app.include_router(auth_router, prefix="/v1")
app.include_router(sessions_router, prefix="/v1")
app.include_router(analytics_router, prefix="/v1")
app.include_router(settings_router, prefix="/v1")
app.include_router(tasks_router, prefix="/v1")


# ----- Frontend static -----
def _find_repo_root() -> Path:
    here = Path(__file__).resolve()
    for p in here.parents:
        if (p / "frontend").exists():
            return p
    # fallback: ожидаем структуру /app/backend/src/app/main.py
    return here.parents[4]


REPO_ROOT = _find_repo_root()
FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_INDEX = FRONTEND_DIR / "index.html"
FRONTEND_SRC_DIR = FRONTEND_DIR / "src"

if FRONTEND_SRC_DIR.exists():
    app.mount("/src", StaticFiles(directory=str(FRONTEND_SRC_DIR)), name="frontend-src")


def _serve_index():
    if FRONTEND_INDEX.exists():
        return FileResponse(str(FRONTEND_INDEX), media_type="text/html; charset=utf-8")
    return Response(content="frontend/index.html not found", media_type="text/plain; charset=utf-8", status_code=404)


# Render иногда делает HEAD /
@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
def frontend_root():
    return _serve_index()


# SPA fallback (чтобы прямые переходы по URL работали)
@app.get("/{full_path:path}", include_in_schema=False)
def frontend_spa_fallback(full_path: str):
    top = (full_path.split("/", 1)[0] or "").lower()
    if top in {"v1", "metrics", "health", "ready", "src"}:
        raise HTTPException(status_code=404, detail="Not Found")
    return _serve_index()
