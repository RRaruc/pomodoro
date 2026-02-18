from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.models.user import User
from app.db.models.user_settings import UserSettings
from app.db.session import get_db
from app.schemas.settings import SettingsOut, SettingsUpdateIn

router = APIRouter(prefix="/settings", tags=["settings"])


def _get_or_create(db: Session, user_id: int) -> UserSettings:
    s = db.get(UserSettings, user_id)
    if s:
        return s
    s = UserSettings(user_id=user_id)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.get("/me", response_model=SettingsOut)
def get_my_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_or_create(db, current_user.id)
    return s


@router.put("/me", response_model=SettingsOut)
def update_my_settings(
    payload: SettingsUpdateIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    s = _get_or_create(db, current_user.id)
    s.work_seconds = payload.work_seconds
    s.short_break_seconds = payload.short_break_seconds
    s.long_break_seconds = payload.long_break_seconds
    s.long_break_every = payload.long_break_every
    db.commit()
    db.refresh(s)
    return s
