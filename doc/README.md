# Open Source Assist — System Documentation

Welcome to the comprehensive technical documentation for the **Open Source Assist** semantic search and repository discovery module.

This module provides an asynchronous, high-throughput semantic search engine that indexes open-source software repositories into **Qdrant Vector Database** and re-ranks results using a **Multiplicative Gate** popularity weighting algorithm.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| **[1. Architecture & Design](architecture.md)** | System architecture, separation of concerns, concurrency model, Python GIL avoidance, and Qdrant Server topology. |
| **[2. Search & Ranking Engine](search_and_ranking.md)** | Mathematical formulation of semantic similarity, logarithmic popularity normalization, and the Strategy pattern. |
| **[3. API & Integration Guide](api_and_integration.md)** | Detailed API contracts for search and ingestion, teammate collaboration specs, and Pydantic schema references. |
| **[4. Deployment & Operations](deployment_and_operations.md)** | Docker Compose configuration, Qdrant Cloud deployment, environment configuration, database seeding, and testing with `uv`. |

---

## 🚀 Key Features Overview

* **Dense Semantic Search**: Natural language query understanding powered by local 384-dimensional embeddings (`FastEmbed` / `bge-small-en-v1.5`), eliminating external embedding API costs and latency.
* **Logarithmic Popularity Normalization**: Dampens steep Power-Law star and fork distributions so massive projects do not swamp emerging or mid-sized repositories.
* **Multiplicative Gate Ranking**:
  $$\text{FinalScore} = S_{\text{semantic}} \times (1 + \alpha \cdot P_{\text{popularity}})$$
  Guarantees semantic relevance remains mandatory while popular and battle-tested repositories receive a proportionate boost.
* **Extensible Strategy Pattern**: Decoupled ranking engine (`ScoringStrategy`) allowing new heuristics (Linear Hybrid, Reciprocal Rank Fusion) to be plugged in dynamically.
* **Production-Grade Qdrant Server**:
  * Standalone client architecture communicating strictly via HTTP REST and gRPC.
  * Zero file-lock contentions between multiple Uvicorn workers or teammate ingestion scripts.
  * HNSW vector indexing with Cosine distance and microsecond payload indexing (`language`, `license`, `topics`, `stars`).
* **Clean Architecture & Strict Typings**:
  * 100% asynchronous Python 3.12+ code managed with `uv`.
  * Routers contain zero business logic.
  * Pydantic v2 models with explicit `Field` documentation for OpenAPI contract generation.
  * Built-in health check and cluster readiness probes.

