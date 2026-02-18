from datetime import datetime
from pydantic import BaseModel, Field


class SessionStartIn(BaseModel):
    kind: str = Field(pattern="^(work|short_break|long_break)$")
    planned_seconds: int = Field(ge=60, le=60 * 60 * 4)


class SessionStopIn(BaseModel):
    ended_at: datetime
    actual_seconds: int = Field(ge=1, le=60 * 60 * 24)


class SessionOut(BaseModel):
    id: int
    user_id: int
    kind: str
    started_at: datetime
    ended_at: datetime | None
    planned_seconds: int
    actual_seconds: int | None

    class Config:
        from_attributes = True
