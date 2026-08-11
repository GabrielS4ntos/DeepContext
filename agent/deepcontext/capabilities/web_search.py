"""Web research through OpenRouter's web plugin."""

from __future__ import annotations

from typing import Any

import httpx

from deepcontext.config import Settings
from deepcontext.exceptions import DependencyUnavailable


class WebResearch:
    """Search the web and normalize URL citations."""

    def __init__(
        self, config: Settings, client: httpx.AsyncClient | None = None
    ) -> None:
        self.config = config
        self._owns_client = client is None
        self.client = client or httpx.AsyncClient(
            base_url=config.web_search_api_url.rstrip("/"), timeout=30
        )

    async def close(self) -> None:
        """Close an internally managed HTTP client."""

        if self._owns_client:
            await self.client.aclose()

    @property
    def configured(self) -> bool:
        """Return whether web search has usable credentials."""

        return (
            self.config.web_search_enabled
            and self.config.web_search_api_key is not None
        )

    async def search(self, query: str) -> list[dict[str, Any]]:
        """Search the web and return cited source snippets."""

        if not self.config.web_search_enabled:
            return []
        if self.config.web_search_api_key is None:
            raise DependencyUnavailable(
                "web_search_unavailable", "Web search is not configured."
            )

        try:
            response = await self.client.post(
                "/chat/completions",
                headers={
                    "Authorization": (
                        f"Bearer {self.config.web_search_api_key.get_secret_value()}"
                    )
                },
                json={
                    "model": self.config.web_search_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": f"Find reliable sources for: {query}",
                        }
                    ],
                    "plugins": [
                        {"id": "web", "max_results": self.config.web_search_max_results}
                    ],
                },
            )
            response.raise_for_status()
            message = response.json()["choices"][0]["message"]
        except Exception as exc:
            raise DependencyUnavailable(
                "web_search_unavailable", "Web search is currently unavailable."
            ) from exc

        results: list[dict[str, Any]] = []
        seen: set[str] = set()
        for annotation in message.get("annotations", []):
            citation = annotation.get("url_citation", {})
            url = citation.get("url")
            if not url or url in seen:
                continue
            seen.add(url)
            results.append(
                {
                    "content": citation.get("content") or "",
                    "source": url,
                    "title": citation.get("title"),
                    "url": url,
                }
            )
            if len(results) >= self.config.web_search_max_results:
                break
        return results
