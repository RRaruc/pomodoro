from pydantic import BaseModel, Field


class SettingsOut(BaseModel):
    work_seconds: int
    short_break_seconds: int
    long_break_seconds: int
    long_break_every: int

    class Config:
        from_attributes = True


class SettingsUpdateIn(BaseModel):
    work_seconds: int = Field(ge=60, le=60 * 60 * 4)
    short_break_seconds: int = Field(ge=60, le=60 * 60 * 2)
    long_break_seconds: int = Field(ge=60, le=60 * 60 * 4)
    long_break_every: int = Field(ge=2, le=12)
