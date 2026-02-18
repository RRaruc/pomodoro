from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models.user import User
from app.db.models_task import Task
from app.db.session import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("")
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Task).where(Task.user_id == current_user.id).order_by(Task.id.desc())
    return db.execute(q).scalars().all()


@router.post("")
def create_task(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    t = Task(user_id=current_user.id, name=name, pomodoros=0)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.post("/{task_id}/inc")
def inc_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.get(Task, task_id)
    if not t or t.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="task not found")
    t.pomodoros = int(t.pomodoros or 0) + 1
    db.commit()
    db.refresh(t)
    return t


@router.post("/{task_id}/dec")
def dec_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.get(Task, task_id)
    if not t or t.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="task not found")

    current = int(t.pomodoros or 0)
    if current <= 1:
        db.delete(t)
        db.commit()
        return {"deleted": True}

    t.pomodoros = current - 1
    db.commit()
    db.refresh(t)
    return t
