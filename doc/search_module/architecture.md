# System Architecture & Technical Design

This document details the architectural principles, component structure, concurrency mechanics, and vector database topology of the search subsystem.

---

## 1. High-Level Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                             Client / Frontend (Vite + React)                  |
+-------------------------------------------------------------------------------+
                                      |
                           HTTP POST  |  /api/v1/search
                                      v
+-------------------------------------------------------------------------------+
|                            FastAPI Router Layer                               |
|                     (backend/api/routes/search.py)                            |
|        - Strictly handles HTTP routing, Pydantic validation, Depends()        |
|        - Zero business or database logic                                      |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                           Search Business Logic                               |
|                    (backend/services/search_service.py)                       |
|   1. Query Embedding Generation                                               |
|   2. Candidate Vector Retrieval                                               |
|   3. Popularity Log Normalization                                             |
|   4. Multiplicative Gate / Scoring Strategy Reranking                         |
|   5. Pagination & Result Serialization                                        |
+-------------------------------------------------------------------------------+
              |                                               |
              v                                               v
+-----------------------------+               +---------------------------------+
|      Embedding Service      |               |          Qdrant Service         |
| (services/embedding_svc.py) |               |    (services/qdrant_service.py) |
| - FastEmbed ONNX runtime    |               | - AsyncQdrantClient             |
| - Offloaded to worker thread|               | - HNSW Cosine vector search     |
| - Releases Python GIL       |               | - Filtered payload execution    |
+-----------------------------+               +---------------------------------+
                                                              |
                                                              v  (HTTP 6333 / gRPC 6334)
                                              +---------------------------------+
                                              |       Qdrant Server             |
                                              |  (Docker Container / Cloud)     |
                                              |  - Dedicated Rust process       |
                                              |  - MVCC & WAL persistence       |
                                              |  - Payload inverted indexes     |
                                              +---------------------------------+
```

---

## 2. Component Breakdown

### A. Router & Contract Layer (`backend/api/`)
* **`routes/search.py`**:
  * Exposes `POST /api/v1/search` and `POST /api/v1/internal/ingest`.
  * Strictly dispatches validated payloads to `SearchService`.
* **`dependencies.py`**:
  * Provides dependency injection for singletons (`SearchService`, `QdrantService`).
  * Houses the `get_optional_current_user` hook for non-blocking integration with the Auth/User module.

### B. Core Service Layer (`backend/services/`)
* **`search_service.py`**:
  * Orchestrates the two-stage search pipeline: semantic candidate retrieval followed by popularity scoring.
  * Implements `normalize_popularity(stars, forks)`.
* **`qdrant_service.py`**:
  * Manages the `AsyncQdrantClient` connection to the Qdrant Server.
  * Creates collections with Cosine distance and HNSW parameters (`m=16`, `ef_construct=100`).
  * Creates payload indexes on `language`, `license`, `topics`, `stars`, and `forks`.
  * Executes atomic batch upserting and filtered vector queries.
* **`embedding_service.py`**:
  * Encapsulates `FastEmbed` using the `BAAI/bge-small-en-v1.5` model.
  * Generates 384-dimensional dense vectors locally.
* **`scoring_strategy.py`**:
  * Implements the **Strategy Pattern** for repository ranking (`MultiplicativeGateStrategy` and `LinearHybridStrategy`).

### C. Configuration & Schema Layer (`backend/core/` and `backend/schemas/`)
* **`core/config.py`**:
  * Centralized environment variables using `pydantic-settings`.
  * Automatically resolves `.env` from project root or working directory.
* **`schemas/search.py`** & **`schemas/ingest.py`**:
  * Strongly typed Pydantic v2 request/response models with explicit `Field` descriptions.

---

## 3. Concurrency & Performance Engineering

### Eliminating the Python GIL Bottleneck
Generating embeddings requires significant matrix multiplication. If executed synchronously inside Python, the **Global Interpreter Lock (GIL)** would freeze the asyncio event loop, causing all concurrent HTTP requests to stall.

**Our Solution**:
1. FastEmbed uses the **ONNX Runtime (compiled C++)**. During tensor execution, the C++ runtime explicitly releases Python's GIL.
2. In `embedding_service.py`, embedding execution is wrapped in `asyncio.to_thread()`:
   ```python
   async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
       return await asyncio.to_thread(self._embed_sync, texts)
   ```
3. This delegates CPU-bound operations to a background thread pool, leaving the main event loop 100% unblocked to handle high-concurrency search traffic.

### Eliminating Database Locking Issues
Running an embedded vector database in-process creates directory-level locks via RocksDB/SQLite. If multiple Uvicorn workers (`uvicorn --workers 4`) or teammate scripts access the directory, the application crashes with `Database locked`.

**Our Solution**:
* **Pure Server Architecture**: The backend strictly connects to a **Qdrant Server** (via Docker or Cloud).
* Only Qdrant Server touches the disk files.
* Python clients only make network calls (HTTP/gRPC).
* Multiple worker processes, background ingestion tasks, and teammate RAG pipelines read and write concurrently with zero lock contention.

---

## 4. Scalability Design

* **HNSW (Hierarchical Navigable Small World) Indexing**:
  * Configured with `m=16` (connections per node) and `ef_construct=100` (search depth during index build).
  * Sub-millisecond approximate nearest neighbor (ANN) search across millions of vectors.
* **Payload Indexing**:
  * Filter fields (`language`, `license`, `stars`, `topics`) are pre-indexed in Qdrant.
  * Filters execute during vector traversal, preventing slow full-table scans.
* **Quantization Ready**:
  * The collection configuration is ready for Scalar Quantization (`int8`), reducing vector RAM usage by ~75% when scaling past 100,000 repositories.

