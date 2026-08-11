from unittest.mock import AsyncMock

from fastapi.testclient import TestClient

from deepcontext.contracts import ResearchResponse, Source
from deepcontext.main import app


def test_health() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}


def test_research() -> None:
    with TestClient(app) as client:
        app.state.agent.research = AsyncMock(
            return_value=ResearchResponse(
                answer="Grounded answer",
                sources=[Source(source="memory", chunk_id="1")],
            )
        )
        response = client.post("/v1/research", json={"query": "question"})
        assert response.status_code == 200
        assert response.json()["answer"] == "Grounded answer"


def test_no_ingestion_endpoint() -> None:
    with TestClient(app) as client:
        assert client.post("/v1/documents", json={"text": "x"}).status_code == 404
