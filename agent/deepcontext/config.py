"""Environment-backed application settings."""

from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """DeepContext runtime configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="DEEPCONTEXT_",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "DeepContext"
    environment: str = "development"
    log_level: str = "INFO"
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])

    chat_model: str = "openai:gpt-4.1-mini"
    embedding_model: str = "openai:text-embedding-3-small"
    temperature: float = 0.1
    max_iterations: int = Field(default=8, ge=1, le=20)

    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "deepcontext"
    qdrant_vector_name: str | None = None
    qdrant_limit: int = Field(default=8, ge=1, le=50)
    qdrant_candidate_limit: int = Field(default=20, ge=1, le=100)
    qdrant_score_threshold: float | None = None
    qdrant_text_field: str = "page_content"
    qdrant_source_field: str = "source"
    qdrant_title_field: str = "title"
    qdrant_url_field: str = "url"
    qdrant_source_id_field: str = "source_id"
    qdrant_max_chunks_per_source: int = Field(default=2, ge=1, le=10)

    web_search_enabled: bool = True
    web_search_api_url: str = "https://openrouter.ai/api/v1"
    web_search_api_key: SecretStr | None = None
    web_search_model: str = "openai/gpt-4.1-mini"
    web_search_max_results: int = Field(default=5, ge=1, le=10)


@lru_cache
def get_settings() -> Settings:
    """Return the cached runtime settings."""

    return Settings()


settings = get_settings()
