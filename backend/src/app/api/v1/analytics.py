from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models.pomodoro_session import PomodoroSession
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.analytics import DaySummary, SummaryOut

router = APIRouter(prefix="/analytics", tags=["analytics"])

TZ = ZoneInfo("Europe/Vilnius")


def _today_local() -> date:
    return datetime.now(TZ).date()


@router.get("/summary", response_model=SummaryOut)
def summary(
    days: int = Query(default=7, ge=1, le=366),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    end_day = _today_local()
    start_day = end_day - timedelta(days=days - 1)

    # Агрегация завершённых рабочих сессий по дням (Europe/Vilnius).
    day_expr = func.date(func.timezone("Europe/Vilnius", PomodoroSession.started_at))

    rows = (
        db.query(
            day_expr.label("day"),
            func.coalesce(func.sum(PomodoroSession.actual_seconds), 0).label("focus_seconds"),
            func.count(PomodoroSession.id).label("completed_count"),
        )
        .filter(PomodoroSession.user_id == current_user.id)
        .filter(PomodoroSession.kind == "work")
        .filter(PomodoroSession.ended_at.isnot(None))
        .filter(day_expr >= start_day)
        .filter(day_expr <= end_day)
        .group_by(day_expr)
        .order_by(day_expr.asc())
        .all()
    )

    by_day: dict[date, tuple[int, int]] = {
        r.day: (int(r.focus_seconds or 0), int(r.completed_count or 0)) for r in rows
    }

    items: list[DaySummary] = []
    d = start_day
    while d <= end_day:
        focus_seconds, completed_count = by_day.get(d, (0, 0))
        items.append(
            DaySummary(
                date=d.isoformat(),
                focus_seconds=focus_seconds,
                completed_work_sessions=completed_count,
            )
        )
        d += timedelta(days=1)

    # Streak: дни подряд с хотя бы одним запуском work-сессии (started_at), независимо от завершения.
    active_days_rows = (
        db.query(day_expr.label("day"))
        .filter(PomodoroSession.user_id == current_user.id)
        .filter(PomodoroSession.kind == "work")
        .filter(day_expr <= end_day)
        .filter(day_expr >= end_day - timedelta(days=366))  # ограничение поиска серии
        .distinct()
        .all()
    )
    active_days = {r.day for r in active_days_rows}

    streak = 0
    cur = end_day
    while cur in active_days:
        streak += 1
        cur -= timedelta(days=1)

    return SummaryOut(days=days, streak_days=streak, items=items)
