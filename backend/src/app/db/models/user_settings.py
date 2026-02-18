from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)

    work_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=1500)
    short_break_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    long_break_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=900)
    long_break_every: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
