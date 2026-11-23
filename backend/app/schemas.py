"""Request bodies for the REST API."""
from typing import Literal

from pydantic import BaseModel, Field


class TextRecordIn(BaseModel):
    text: str = Field(..., min_length=1)
    name: str | None = None
    source: str = "Pasted / typed"
    meta: dict = Field(default_factory=dict)


class SimulateIn(BaseModel):
    kind: Literal["curated", "random"] = "random"
    key: Literal["A", "B", "C"] | None = None
    count: int = Field(1, ge=1, le=50)
    source: str | None = None


class RecordPatch(BaseModel):
    meta: dict | None = None
    threshold: float | None = Field(None, ge=0.5, le=0.99)
    name: str | None = None


class DecisionIn(BaseModel):
    code: str
    decision: Literal["accept", "reject", "clear"]


class DeleteOverrideIn(BaseModel):
    code: str
    keep: bool


class QueryResponseIn(BaseModel):
    response: Literal["yes", "next", "und"] | None


class SubscribeIn(BaseModel):
    plan_id: str
    duration: Literal["month", "quarter", "year"]
    quantity: int = Field(..., ge=1, le=5_000_000)
