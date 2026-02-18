from pydantic import BaseModel, Field


class TaskCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class TaskOut(BaseModel):
    id: int
    name: str
    pomodoros: int
