# API Contract Changelog

This document tracks all FastAPI endpoint contracts, request payloads, and response structures for the `open-source-assist` project.

---

## [v0.1.0] - 2026-09-21: Semantic Search & Ingestion Endpoints

### 1. Semantic Repository Search
* **Endpoint**: `POST /api/v1/search`
* **Status**: `200 OK`
* **Description**: Performs dense semantic similarity search over indexed open-source repositories using Qdrant vector database and reranks results using logarithmic popularity normalization combined with the Multiplicative Gate strategy.
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>` (Optional)
* **Request Body** (`RepoSearchRequest`):
  ```json
  {
    "query": "lightweight async web framework for microservices",
    "popularity_weight": 0.3,
    "filters": {
      "language": "Python",
      "min_stars": 50,
      "license": "MIT",
      "topic": "fastapi"
    },
    "limit": 20,
    "offset": 0
  }
  ```
* **Response Body** (`RepoSearchResponse`):
  ```json
  {
    "query": "lightweight async web framework for microservices",
    "total": 1,
    "limit": 20,
    "offset": 0,
    "items": [
      {
        "repo_id": 89229960,
        "full_name": "tiangolo/fastapi",
        "html_url": "https://github.com/tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        "language": "Python",
        "stars": 75420,
        "forks": 6400,
        "open_issues": 412,
        "license": "MIT",
        "topics": ["fastapi", "asyncio", "python", "rest-api"],
        "pushed_at": "2026-09-20T14:32:00Z",
        "scores": {
          "semantic_score": 0.885,
          "popularity_score": 0.942,
          "final_score": 1.1351,
          "strategy": "MultiplicativeGateStrategy"
        }
      }
    ],
    "strategy": "MultiplicativeGateStrategy",
    "duration_ms": 14.82
  }
  ```

---

### 2. Batch Repository Ingestion (Internal)
* **Endpoint**: `POST /api/v1/internal/ingest`
* **Status**: `201 Created`
* **Description**: Sourcing/ingestion contract for indexing repository records into Qdrant. Computes dense embeddings and batch upserts points into the configured collection.
* **Request Body** (`BatchRepoIngestRequest`):
  ```json
  {
    "repositories": [
      {
        "repo_id": 89229960,
        "full_name": "tiangolo/fastapi",
        "html_url": "https://github.com/tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
        "language": "Python",
        "stars": 75420,
        "forks": 6400,
        "open_issues": 412,
        "license": "MIT",
        "topics": ["fastapi", "asyncio", "python", "rest-api"],
        "pushed_at": "2026-09-20T14:32:00Z",
        "readme_summary": "High performance ASGI web framework built with Starlette and Pydantic."
      }
    ]
  }
  ```
* **Response Body** (`BatchRepoIngestResponse`):
  ```json
  {
    "inserted_count": 1,
    "collection_name": "open_source_repositories",
    "duration_ms": 182.4
  }
  ```

---

### 3. System Health Check
* **Endpoint**: `GET /health`
* **Status**: `200 OK`
* **Response**:
  ```json
  {
    "status": "healthy",
    "service": "open-source-assist-backend"
  }
  ```

