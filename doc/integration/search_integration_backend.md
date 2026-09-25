# Teammate Integration Guide

This guide explains how other modules in the project (Data Ingestion, RAG, and Auth) interface with the search subsystem.

> ℹ️ **REST API Endpoints**: For external HTTP endpoints, request/response JSON schemas, and OpenAPI contracts, see the root [API_CONTRACT.md](../API_CONTRACT.md).

---

## 1. Data Ingestion Module (Teammate)

The teammate responsible for data collection and repository extraction can feed repositories into Qdrant using either direct Python service imports or HTTP.

### Method A: Direct Python Service Import (Recommended for Workers)
If the ingestion pipeline runs as a Python worker or CLI in the same repository, import `search_service` and `RepoIngestItem` directly:

```python
from backend.schemas.ingest import BatchRepoIngestRequest, RepoIngestItem
from backend.services.search_service import search_service

async def run_ingestion_pipeline():
    # 1. Prepare repository objects extracted from GitHub
    repos = [
        RepoIngestItem(
            repo_id=89229960,
            full_name="tiangolo/fastapi",
            html_url="https://github.com/tiangolo/fastapi",
            description="FastAPI framework, high performance, easy to learn, fast to code, ready for production",
            language="Python",
            stars=78500,
            forks=6700,
            open_issues=420,
            license="MIT",
            topics=["fastapi", "asyncio", "python", "rest-api"],
            pushed_at="2026-09-20T10:00:00Z",
            readme_summary="High performance async web framework for building APIs with Python 3.8+.",
        ),
        # ... add more repositories in batches of 50-200
    ]

    # 2. Batch vectorize and upsert into Qdrant
    response = await search_service.ingest_repositories(
        BatchRepoIngestRequest(repositories=repos)
    )

    print(f"Upserted {response.inserted_count} repositories in {response.duration_ms}ms")
```

### Method B: Via Internal HTTP Endpoint
If the ingestion pipeline is written in another language or runs as an isolated microservice, send an HTTP POST request to:
* **Endpoint**: `POST /api/v1/internal/ingest`
* Refer to [API_CONTRACT.md](../API_CONTRACT.md#2-batch-repository-ingestion-internal) for the exact JSON payload.

---

## 2. RAG & AI Mentor Module (Teammate)

If a teammate is building an AI Mentor, Question Answering, or RAG (Retrieval-Augmented Generation) pipeline:

### Zero Resource Contention on Qdrant
* Both modules connect to the **same Qdrant Server** instance (`http://localhost:6333` or Qdrant Cloud).
* To prevent collisions, the RAG module should use its own distinct collection:
  * **Search Subsystem Collection**: `open_source_repositories` (384 dimensions).
  * **RAG Subsystem Collection**: e.g., `rag_code_snippets` or `issue_discussions` (can use 1536 or any other vector dimension).
* Because collections in Qdrant are completely isolated, read and write operations execute concurrently without interference, locking, or schema collisions.

---

## 3. Authentication & User Module (Teammate)

The search subsystem is functional for guest and unauthenticated users by default.

### Plugging in Authentication
In [`backend/api/dependencies.py`](../backend/api/dependencies.py), there is a dedicated dependency hook:

```python
async def get_optional_current_user(
    authorization: str | None = Header(default=None),
) -> dict[str, Any] | None:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        # Replace with your JWT decoding function:
        # return decode_user_jwt(token)
        return {"user_id": "authenticated_user", "token": token}
    return None
```

When the Auth teammate finishes the JWT/session service:
1. Replace this stub with their JWT verification logic.
2. The search route will automatically receive the authenticated user's `user_id` to log search history or apply user-specific preferred languages without changing the search router code.

