"""Public and internal data contracts."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ResearchRequest(BaseModel):
    """A research question."""

    query: str = Field(min_length=1, max_length=20_000)
    thread_id: str | None = Field(default=None, max_length=200)


class Source(BaseModel):
    """A source used to ground an answer."""

    source: str
    title: str | None = None
    url: str | None = None
    chunk_id: str | None = None


class ResearchResponse(BaseModel):
    """A completed or partially completed research result."""

    answer: str
    sources: list[Source] = Field(default_factory=list)
    status: Literal["complete", "partial"] = "complete"


class ErrorDetail(BaseModel):
    """Stable error payload."""

    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    """Error envelope."""

    error: ErrorDetail
