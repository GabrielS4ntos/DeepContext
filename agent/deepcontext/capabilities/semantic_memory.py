"""Read-only semantic retrieval from Qdrant."""

from __future__ import annotations

from typing import Any

from langchain.embeddings import init_embeddings
from qdrant_client import AsyncQdrantClient, models

from deepcontext.config import Settings
from deepcontext.exceptions import DependencyUnavailable


def prepare_query(text: str, model_name: str) -> str:
    """Apply the query prefix expected by E5-family embedding models."""

    normalized = model_name.lower()
    if "multilingual-e5" in normalized or "/e5-" in normalized or ":e5-" in normalized:
        return text if text.startswith("query: ") else f"query: {text}"
    return text


class SemanticMemory:
    """Generate query vectors and retrieve existing Qdrant points."""

    def __init__(
        self, config: Settings, client: AsyncQdrantClient | None = None
    ) -> None:
        self.config = config
        api_key = (
            config.qdrant_api_key.get_secret_value()
            if config.qdrant_api_key is not None
            else None
        )
        self.client = client or AsyncQdrantClient(
            url=config.qdrant_url,
            api_key=api_key,
            timeout=30,
        )
        self.embeddings = init_embeddings(config.embedding_model)

    async def close(self) -> None:
        """Close the Qdrant transport."""

        await self.client.close()

    async def ready(self) -> bool:
        """Return whether the configured collection can be read."""

        try:
            return await self.client.collection_exists(self.config.qdrant_collection)
        except Exception:
            return False

    def _normalize(self, point: models.ScoredPoint) -> dict[str, Any] | None:
        payload = point.payload or {}
        text = payload.get(self.config.qdrant_text_field)
        if not isinstance(text, str) or not text.strip():
            return None
        source = payload.get(self.config.qdrant_source_field)
        source_id = (
            payload.get(self.config.qdrant_source_id_field) or source or point.id
        )
        return {
            "content": text,
            "score": float(point.score),
            "source": str(source or source_id),
            "source_id": str(source_id),
            "title": payload.get(self.config.qdrant_title_field),
            "url": payload.get(self.config.qdrant_url_field),
            "chunk_id": str(point.id),
        }

    async def search(self, query: str) -> list[dict[str, Any]]:
        """Run dense retrieval and return normalized, source-diverse results."""

        try:
            vector = await self.embeddings.aembed_query(
                prepare_query(query, self.config.embedding_model)
            )
            kwargs: dict[str, Any] = {
                "collection_name": self.config.qdrant_collection,
                "query": vector,
                "with_payload": True,
                "limit": self.config.qdrant_candidate_limit,
            }
            if self.config.qdrant_vector_name:
                kwargs["using"] = self.config.qdrant_vector_name
            if self.config.qdrant_score_threshold is not None:
                kwargs["score_threshold"] = self.config.qdrant_score_threshold
            response = await self.client.query_points(**kwargs)
        except Exception as exc:
            raise DependencyUnavailable(
                "semantic_search_unavailable",
                "Semantic memory is currently unavailable.",
            ) from exc

        results: list[dict[str, Any]] = []
        counts: dict[str, int] = {}
        for point in response.points:
            item = self._normalize(point)
            if item is None:
                continue
            source_id = item["source_id"]
            if counts.get(source_id, 0) >= self.config.qdrant_max_chunks_per_source:
                continue
            counts[source_id] = counts.get(source_id, 0) + 1
            results.append(item)
            if len(results) >= self.config.qdrant_limit:
                break
        return results
