from pydantic import BaseModel, Field


class DaySummary(BaseModel):
    date: str = Field(description="YYYY-MM-DD in Europe/Vilnius")
    focus_seconds: int = Field(ge=0)
    completed_work_sessions: int = Field(ge=0)


class SummaryOut(BaseModel):
    days: int = Field(ge=1, le=366)
    streak_days: int = Field(ge=0, description="Consecutive days with at least one started work session")
    items: list[DaySummary]
