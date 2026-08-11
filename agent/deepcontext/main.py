"""FastAPI entry point for DeepContext."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from deepcontext.capabilities import SemanticMemory, WebResearch
from deepcontext.config import settings
from deepcontext.contracts import (
    ErrorDetail,
    ErrorResponse,
    ResearchRequest,
    ResearchResponse,
)
from deepcontext.exceptions import DependencyUnavailable
from deepcontext.observability import configure
from deepcontext.orchestration import ResearchWorkflow

logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and close shared research dependencies."""

    retrieval = SemanticMemory(settings)
    web = WebResearch(settings)
    app.state.retrieval = retrieval
    app.state.web = web
    app.state.agent = ResearchWorkflow(settings, retrieval, web)
    yield
    await retrieval.close()
    await web.close()


app = FastAPI(
    title="DeepContext",
    description=(
        "An autonomous research agent with web search, Qdrant-powered semantic "
        "memory, tool calling, and multi-step reasoning."
    ),
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
configure(app)


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    """Build the stable API error envelope."""

    payload = ErrorResponse(error=ErrorDetail(code=code, message=message))
    return JSONResponse(status_code=status_code, content=payload.model_dump())


@app.exception_handler(DependencyUnavailable)
async def dependency_error_handler(
    _request: Request, exc: DependencyUnavailable
) -> JSONResponse:
    """Map unavailable dependencies to HTTP 503."""

    return error_response(exc.code, exc.message, 503)


@app.get("/health")
async def health() -> dict[str, str]:
    """Report process health."""

    return {"status": "ok"}


@app.get("/ready")
async def ready(request: Request) -> JSONResponse:
    """Report availability of optional research sources."""

    semantic = await request.app.state.retrieval.ready()
    web = request.app.state.web.configured
    ready_state = semantic or web
    return JSONResponse(
        status_code=200 if ready_state else 503,
        content={
            "status": "ready" if ready_state else "unavailable",
            "dependencies": {"semantic_memory": semantic, "web_search": web},
        },
    )


async def execute_research(request: Request, body: ResearchRequest) -> ResearchResponse:
    """Run research and require at least one grounded source."""

    result = await request.app.state.agent.research(body.query)
    if not result.sources:
        raise DependencyUnavailable(
            "research_sources_unavailable",
            "No usable research evidence was found.",
        )
    return result


@app.post(
    "/v1/research",
    response_model=ResearchResponse,
    responses={503: {"model": ErrorResponse}},
)
async def research(request: Request, body: ResearchRequest) -> ResearchResponse:
    """Research a question and return a grounded answer."""

    return await execute_research(request, body)


@app.post("/v1/research/stream")
async def research_stream(
    request: Request, body: ResearchRequest
) -> EventSourceResponse:
    """Return research output as a stable SSE event sequence."""

    async def events() -> AsyncIterator[dict[str, str]]:
        yield {
            "event": "metadata",
            "data": json.dumps({"thread_id": body.thread_id}),
        }
        try:
            result = await execute_research(request, body)
            for token in result.answer.split(" "):
                yield {
                    "event": "token",
                    "data": json.dumps({"content": f"{token} "}),
                }
            yield {"event": "result", "data": result.model_dump_json()}
        except DependencyUnavailable as exc:
            payload = ErrorResponse(
                error=ErrorDetail(code=exc.code, message=exc.message)
            )
            yield {"event": "error", "data": payload.model_dump_json()}
        except Exception:
            logger.exception("Research stream failed")
            payload = ErrorResponse(
                error=ErrorDetail(
                    code="internal_error", message="Research could not be completed."
                )
            )
            yield {"event": "error", "data": payload.model_dump_json()}

    return EventSourceResponse(events())
