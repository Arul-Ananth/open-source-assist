# API & Integration Guide

This document defines all endpoints, Pydantic data contracts, and teammate integration specifications.

---

## 1. Endpoints Reference

### A. Semantic Repository Search
* **Route**: `POST /api/v1/search`
* **Status**: `200 OK`
* **Summary**: Executes semantic repository search with dynamic popularity weighting and metadata filtering.

#### Request Body (`RepoSearchRequest`)
| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | — | Natural language query (1 to 500 chars). |
| `popularity_weight` | `float` | No | `0.3` | Weight $\alpha \in [0.0, 1.0]$. $0.0$ = pure semantic; $1.0$ = maximum popularity amplification. |
| `filters` | `object` | No | `null` | Metadata filter criteria (see below). |
| `limit` | `int` | No | `20` | Max results to return ($1 \le \text{limit} \le 100$). |
| `offset` | `int` | No | `0` | Pagination offset ($\ge 0$). |

**Filters Object (`RepoSearchFilter`)**:
```json
{
  "language": "Python",
  "min_stars": 50,
  "license": "MIT",
  "topic": "fastapi"
}
```

#### Sample Search Request:
```bash
curl -X POST "http://localhost:8000/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "async web framework for building microservice APIs",
    "popularity_weight": 0.5,
    "filters": {
      "language": "Python",
      "min_stars": 100
    },
    "limit": 10,
    "offset": 0
  }'
```

#### Sample Search Response (`RepoSearchResponse`):
```json
{
  "query": "async web framework for building microservice APIs",
  "total": 1,
  "limit": 10,
  "offset": 0,
  "items": [
    {
      "repo_id": 89229960,
      "full_name": "tiangolo/fastapi",
      "html_url": "https://github.com/tiangolo/fastapi",
      "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
      "language": "Python",
      "stars": 78500,
      "forks": 6700,
      "open_issues": 420,
      "license": "MIT",
      "topics": ["fastapi", "asyncio", "python", "rest-api"],
      "pushed_at": "2026-09-20T10:00:00Z",
      "scores": {
        "semantic_score": 0.885,
        "popularity_score": 0.942,
        "final_score": 1.3018,
        "strategy": "MultiplicativeGateStrategy"
      }
    }
  ],
  "strategy": "MultiplicativeGateStrategy",
  "duration_ms": 11.25
}
```

---

### B. Batch Repository Ingestion
* **Route**: `POST /api/v1/internal/ingest`
* **Status**: `201 Created`
* **Summary**: Ingestion endpoint for the teammate's data sourcing pipeline. Batch vectorizes and upserts repositories into Qdrant.

#### Request Body (`BatchRepoIngestRequest`):
```json
{
  "repositories": [
    {
      "repo_id": 89229960,
      "full_name": "tiangolo/fastapi",
      "html_url": "https://github.com/tiangolo/fastapi",
      "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
      "language": "Python",
      "stars": 78500,
      "forks": 6700,
      "open_issues": 420,
      "license": "MIT",
      "topics": ["fastapi", "asyncio", "python", "rest-api"],
      "pushed_at": "2026-09-20T10:00:00Z",
      "readme_summary": "Modern, fast web framework for building APIs with Python 3.8+."
    }
  ]
}
```

#### Response Body (`BatchRepoIngestResponse`):
```json
{
  "inserted_count": 1,
  "collection_name": "open_source_repositories",
  "duration_ms": 215.4
}
```

---

### C. Health Check
* **Route**: `GET /health`
* **Status**: `200 OK`
* **Response**:
  ```json
  {
    "status": "healthy",
    "service": "open-source-assist-backend"
  }
  ```

---

## 2. Teammate Integration Guide

### A. Data Ingestion Module (Teammate)
The teammate responsible for data collection can ingest repositories in two ways:

1. **Via Direct Python Import (Recommended for internal workers)**:
   ```python
   from backend.schemas.ingest import BatchRepoIngestRequest, RepoIngestItem
   from backend.services.search_service import search_service

   repos = [
       RepoIngestItem(
           repo_id=...,
           full_name=...,
           html_url=...,
           description=...,
           language=...,
           stars=...,
           forks=...,
           license=...,
           topics=...,
       )
   ]

   response = await search_service.ingest_repositories(
       BatchRepoIngestRequest(repositories=repos)
   )
   print(f"Upserted {response.inserted_count} repositories")
   ```
2. **Via HTTP API**: Send a `POST` request to `/api/v1/internal/ingest` with the JSON payload.

### B. Teammate RAG Module (Zero Collision)
If a teammate is building a Retrieval-Augmented Generation (RAG) module:
* They connect to the **same Qdrant Server** (`http://localhost:6333` or Cloud).
* They specify their own distinct collection name in their service (e.g., `rag_knowledge_base`).
* **Collections are completely independent**: their embeddings, vector dimensions, and payloads will never interfere with `open_source_repositories`.

### C. Authentication & User Module (Teammate)
Search works out of the box for guest users. In [`backend/api/dependencies.py`](file:///c:/Dev/open-source-assist/backend/api/dependencies.py), there is a hook:
```python
async def get_optional_current_user(...) -> dict[str, Any] | None:
```
When the Auth teammate finishes their JWT/session module, they replace this stub with their user validation function to enable personalized search history and user-specific language preferences.

