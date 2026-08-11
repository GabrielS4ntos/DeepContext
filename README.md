# DeepContext

DeepContext is an autonomous research agent with web search, Qdrant-powered semantic memory, tool calling, and multi-step reasoning.

It is intentionally domain-neutral. The agent generates an embedding only for the incoming query, searches an existing Qdrant collection, optionally searches the web, and synthesizes a grounded response with source metadata. It never creates collections, ingests documents, or mutates stored points.

## Monorepo layout

```text
agent/       Python research-agent API
backend/     reserved for a future web application backend
frontend/    reserved for a future web client
pipelines/   reserved for future workflow definitions
k8s/         Kubernetes baseline
compose.yaml local agent and Qdrant stack
```

## How research works

1. A LangGraph workflow receives the question.
2. The configured LangChain embedding provider creates the query vector.
3. The agent searches a pre-populated Qdrant collection and can search the web.
4. The model decides whether more tool calls are needed, up to a bounded limit.
5. DeepContext returns a grounded answer and the sources it used.

The embedding model must match the model and vector dimension used to populate the collection.

## Qdrant collection contract

The collection must already exist. Dense vectors may use Qdrant's unnamed default vector or a named vector set through `DEEPCONTEXT_QDRANT_VECTOR_NAME`. Payload field names are configurable; defaults are:

```json
{
  "page_content": "Text supplied to the model",
  "source": "Human-readable source identifier",
  "source_id": "Stable identifier used for deduplication",
  "title": "Optional title",
  "url": "Optional URL"
}
```

DeepContext keeps at most two chunks from the same source by default.

## Local setup

Requires Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```bash
cd agent
cp .env.example .env
uv sync
uv run uvicorn deepcontext.main:app --reload --port 8000
```

Set the API key required by the selected chat and embedding providers. Model identifiers use LangChain's `provider:model` format. `init_chat_model` and `init_embeddings` allow provider changes through configuration; install the matching LangChain integration package when selecting a provider not included by default.

## Docker Compose

```bash
cp agent/.env.example agent/.env
docker compose up --build
```

The API is available at `http://localhost:8000`; Qdrant is available at `http://localhost:6333`.

The first local Qdrant volume is empty. Populate it using external tooling, connect the agent to an external Qdrant URL, or reuse a pre-populated Docker volume:

```bash
QDRANT_VOLUME_NAME=my-existing-qdrant-volume docker compose up --build
```

Data population and document embeddings deliberately live outside this repository. Web research can still operate while local semantic memory is empty.

## API

```bash
curl -X POST http://localhost:8000/v1/research \
  -H 'Content-Type: application/json' \
  -d '{"query":"Compare the main approaches to retrieval-augmented generation."}'
```

Use `POST /v1/research/stream` with the same body for server-sent events. `thread_id` is optional correlation metadata; conversation state is not persisted.

- `GET /health` reports process health.
- `GET /ready` reports semantic-memory and web-search availability.
- OpenAPI documentation is available at `/docs`.

## Observability

Set `OTEL_EXPORTER_OTLP_ENDPOINT` to export OpenTelemetry traces, metrics, and logs. Leave it empty or set `OTEL_SDK_DISABLED=true` to run without telemetry export. Langfuse uses its standard environment variables and remains optional.

## Tests and quality checks

```bash
cd agent
uv run pytest
uv run ruff check deepcontext tests
uv run ruff format --check deepcontext tests
uv run mypy deepcontext
```

## Kubernetes

The manifests deploy only the agent API. Create the referenced `deepcontext-agent-env` Secret with model, Qdrant, web-search, and optional observability configuration, update the placeholder image, then apply:

```bash
kubectl apply -k k8s
```

Qdrant is externally managed in the Kubernetes baseline.

