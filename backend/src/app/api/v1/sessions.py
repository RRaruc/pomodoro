from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from prometheus_client import Counter
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models.pomodoro_session import PomodoroSession
from app.db.models.user import User
from app.db.models.user_settings import UserSettings
from app.db.session import get_db
from app.schemas.next_session import NextSessionOut
from app.schemas.pomodoro import SessionOut, SessionStartIn, SessionStopIn

router = APIRouter(prefix="/sessions", tags=["sessions"])

SESSIONS_STARTED = Counter("pomodoro_sessions_started_total", "Started pomodoro sessions total", ["kind"])
SESSIONS_STOPPED = Counter("pomodoro_sessions_stopped_total", "Stopped pomodoro sessions total", ["kind"])
WORK_COMPLETED = Counter("pomodoro_work_completed_total", "Completed work sessions total")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/start", response_model=SessionOut)
def start_session(
    payload: SessionStartIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = PomodoroSession(
        user_id=current_user.id,
        kind=payload.kind,
        started_at=_now_utc(),
        planned_seconds=payload.planned_seconds,
        ended_at=None,
        actual_seconds=None,
    )
    db.add(s)
    db.commit()
    db.refresh(s)

    SESSIONS_STARTED.labels(kind=s.kind).inc()

    return s


@router.post("/{session_id}/stop", response_model=SessionOut)
def stop_session(
    session_id: int,
    payload: SessionStopIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = db.get(PomodoroSession, session_id)
    if not s or s.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="session not found")

    if s.ended_at is not None:
        raise HTTPException(status_code=409, detail="session already ended")

    ended_at = payload.ended_at
    if ended_at.tzinfo is None:
        ended_at = ended_at.replace(tzinfo=timezone.utc)

    if ended_at < s.started_at:
        raise HTTPException(status_code=400, detail="ended_at cannot be earlier than started_at")

    diff_seconds = int((ended_at - s.started_at).total_seconds())
    if payload.actual_seconds > diff_seconds + 5:
        raise HTTPException(status_code=400, detail="actual_seconds is inconsistent with timestamps")

    s.ended_at = ended_at
    s.actual_seconds = payload.actual_seconds
    db.commit()
    db.refresh(s)

    SESSIONS_STOPPED.labels(kind=s.kind).inc()
    if s.kind == "work":
        WORK_COMPLETED.inc()

    return s


@router.get("", response_model=list[SessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(PomodoroSession)
        .filter(PomodoroSession.user_id == current_user.id)
        .order_by(PomodoroSession.started_at.desc())
        .limit(100)
        .all()
    )


@router.get("/next", response_model=NextSessionOut)
def recommend_next_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active = db.execute(
        select(PomodoroSession).where(
            PomodoroSession.user_id == current_user.id,
            PomodoroSession.ended_at.is_(None),
        )
    ).scalar_one_or_none()

    if active:
        return NextSessionOut(next_kind=active.kind, duration_seconds=active.planned_seconds)

    work_count = db.execute(
        select(func.count()).where(
            PomodoroSession.user_id == current_user.id,
            PomodoroSession.kind == "work",
            PomodoroSession.ended_at.is_not(None),
        )
    ).scalar_one()

    settings = db.get(UserSettings, current_user.id)
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)

    if work_count > 0 and work_count % settings.long_break_every == 0:
        return NextSessionOut(next_kind="long_break", duration_seconds=settings.long_break_seconds)

    if work_count > 0:
        return NextSessionOut(next_kind="short_break", duration_seconds=settings.short_break_seconds)

    return NextSessionOut(next_kind="work", duration_seconds=settings.work_seconds)
