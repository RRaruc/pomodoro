from pydantic import BaseModel


class NextSessionOut(BaseModel):
    next_kind: str
    duration_seconds: int
