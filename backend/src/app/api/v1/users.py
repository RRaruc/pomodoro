import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.user import User
from app.db.session import get_db
from app.schemas.user import UserCreateIn, UserOut

router = APIRouter(prefix="/users", tags=["users"])


def _hash_password(pw: str) -> str:
    # Временное упрощение: позже заменим на bcrypt/argon2.
    return hashlib.sha256(pw.encode("utf-8")).hexdigest()


@router.post("", response_model=UserOut)
def create_user(payload: UserCreateIn, db: Session = Depends(get_db)):
    user = User(email=payload.email, password_hash=_hash_password(payload.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="email already exists")
    db.refresh(user)
    return user
