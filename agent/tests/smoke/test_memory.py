from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from qdrant_client import models

from deepcontext.capabilities.semantic_memory import SemanticMemory, prepare_query
from deepcontext.config import Settings


def test_prepare_query_for_e5() -> None:
    assert prepare_query("hello", "provider:multilingual-e5-large") == "query: hello"
    assert prepare_query("hello", "openai:text-embedding-3-small") == "hello"


@pytest.mark.asyncio
async def test_search_deduplicates_sources() -> None:
    points = [
        models.ScoredPoint(
            id=index,
            version=1,
            score=1 - index / 10,
            payload={"page_content": f"chunk {index}", "source": "doc"},
            vector=None,
        )
        for index in range(3)
    ]
    client = AsyncMock()
    client.query_points.return_value = SimpleNamespace(points=points)
    retrieval = SemanticMemory(
        Settings(_env_file=None, qdrant_max_chunks_per_source=2), client=client
    )
    retrieval.embeddings = AsyncMock()
    retrieval.embeddings.aembed_query.return_value = [0.1, 0.2]

    results = await retrieval.search("question")

    assert len(results) == 2
    client.query_points.assert_awaited_once()
