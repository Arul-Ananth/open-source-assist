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

---

## [v0.2.0] - 2026-09-22: AI Learning Materials & Citation Agent Endpoint

### 4. Skill-Tailored Online Learning Materials & Citations
* **Endpoint**: `POST /api/v1/learning/materials`
* **Status**: `200 OK`
* **Description**: Executes an AI Agent workflow powered by Gemini API (`gemini-3.5-flash`) and LangGraph to generate personalized step-by-step learning modules and citeable online resources (official documentation, tutorials, technical articles, interactive courses) tailored strictly to the user's skill level.
* **Headers**:
  * `Content-Type: application/json`
  * `Authorization: Bearer <token>` (Optional)
* **Request Body** (`LearningMaterialRequest`):
  ```json
  {
    "topic": "FastAPI Async Microservices",
    "skill_level": "intermediate",
    "user_context": "2 years of Python background, transitioning to async microservice design",
    "preferred_types": ["official_docs", "tutorial", "article"],
    "limit": 5
  }
  ```
* **Response Body** (`LearningMaterialResponse`):
  ```json
  {
    "topic": "FastAPI Async Microservices",
    "skill_level": "intermediate",
    "summary": "Curated Intermediate-level learning materials and step-by-step roadmap for 'FastAPI Async Microservices'.",
    "modules": [
      {
        "module_number": 1,
        "title": "Modular Design & Asynchronous Architecture in FastAPI Async Microservices",
        "description": "Deep dive into modular component design, async workflows, error isolation, and state management.",
        "key_takeaways": [
          "Apply clean architecture and modular design patterns",
          "Manage asynchronous processing, concurrency, and task cancellation",
          "Implement structured exception logging and error boundaries"
        ],
        "cited_material_urls": [
          "https://docs.reference.org/search?q=fastapi+async+microservices"
        ]
      }
    ],
    "cited_materials": [
      {
        "title": "Official FastAPI Async Microservices Documentation & Developer Guide",
        "url": "https://docs.reference.org/search?q=fastapi+async+microservices",
        "material_type": "official_docs",
        "difficulty_level": "intermediate",
        "snippet": "Official documentation covering core architecture, API references, and syntax for FastAPI Async Microservices.",
        "relevance_rationale": "Primary authoritative reference calibrated for Intermediate developers to build fundamental understanding.",
        "topics": ["fastapi async microservices", "official-docs", "api-reference"]
      }
    ],
    "duration_ms": 142.5,
    "model_used": "gemini-3.5-flash"
  }
  ```


