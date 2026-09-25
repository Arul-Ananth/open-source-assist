"""Integration tests for the semantic search and ingestion API routes.

Uses a decoupled mock Qdrant storage fixture to test full FastAPI routing,
Pydantic validation, embedding generation, and ranking logic without
requiring a live external Qdrant Server process during automated CI/CD runs.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from qdrant_client import models

from backend.main import app
from backend.schemas.ingest import RepoIngestItem
from backend.schemas.search import RepoSearchFilter
from backend.services.qdrant_service import qdrant_service


class InMemoryQdrantMock:
    """Mock storage simulating Qdrant Server vector index and payload filtering."""

    def __init__(self) -> None:
        self.points: dict[int, tuple[RepoIngestItem, list[float]]] = {}

    async def ensure_collection_exists(self) -> None:
        pass

    async def check_health(self) -> bool:
        return True

    async def close(self) -> None:
        pass

    async def upsert_repositories(
        self,
        repositories: list[RepoIngestItem],
        embeddings: list[list[float]],
        batch_size: int = 100,
    ) -> int:
        for repo, vec in zip(repositories, embeddings):
            self.points[repo.repo_id] = (repo, vec)
        return len(repositories)

    async def search_candidates(
        self,
        query_vector: list[float],
        limit: int,
        filters: RepoSearchFilter | None = None,
    ) -> list[models.ScoredPoint]:
        scored_points: list[models.ScoredPoint] = []

        for repo_id, (repo, vec) in self.points.items():
            # Apply payload filters
            if filters:
                if filters.language and repo.language != filters.language:
                    continue
                if filters.min_stars is not None and repo.stars < filters.min_stars:
                    continue
                if filters.license and repo.license != filters.license:
                    continue
                if filters.topic and (not repo.topics or filters.topic not in repo.topics):
                    continue

            # Dot product similarity (FastEmbed vectors are unit normalized)
            similarity = sum(q * v for q, v in zip(query_vector, vec))
            scored_points.append(
                models.ScoredPoint(
                    id=repo_id,
                    version=1,
                    score=float(similarity),
                    payload={
                        "repo_id": repo.repo_id,
                        "full_name": repo.full_name,
                        "html_url": repo.html_url,
                        "description": repo.description,
                        "language": repo.language,
                        "stars": repo.stars,
                        "forks": repo.forks,
                        "open_issues": repo.open_issues,
                        "license": repo.license,
                        "topics": repo.topics,
                        "pushed_at": repo.pushed_at,
                        "readme_summary": repo.readme_summary,
                    },
                )
            )

        scored_points.sort(key=lambda p: p.score, reverse=True)
        return scored_points[:limit]


@pytest.fixture(autouse=True)
def mock_qdrant_server(monkeypatch: pytest.MonkeyPatch) -> None:
    """Isolate tests from external Qdrant Server using in-memory mock."""
    mock_storage = InMemoryQdrantMock()
    monkeypatch.setattr(qdrant_service, "ensure_collection_exists", mock_storage.ensure_collection_exists)
    monkeypatch.setattr(qdrant_service, "check_health", mock_storage.check_health)
    monkeypatch.setattr(qdrant_service, "close", mock_storage.close)
    monkeypatch.setattr(qdrant_service, "upsert_repositories", mock_storage.upsert_repositories)
    monkeypatch.setattr(qdrant_service, "search_candidates", mock_storage.search_candidates)


@pytest.mark.asyncio
async def test_health_check() -> None:
    """Verify health check endpoint returns 200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy", "service": "open-source-assist-backend"}


@pytest.mark.asyncio
async def test_ingest_and_search_flow() -> None:
    """End-to-end test: ingest sample repositories and execute semantic search."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest repositories
        ingest_payload = {
            "repositories": [
                {
                    "repo_id": 1,
                    "full_name": "tiangolo/fastapi",
                    "html_url": "https://github.com/tiangolo/fastapi",
                    "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production",
                    "language": "Python",
                    "stars": 80000,
                    "forks": 6500,
                    "open_issues": 400,
                    "license": "MIT",
                    "topics": ["fastapi", "asyncio", "python", "rest-api"],
                    "pushed_at": "2026-09-20T10:00:00Z",
                    "readme_summary": "High performance web framework for building APIs with Python 3.8+.",
                },
                {
                    "repo_id": 2,
                    "full_name": "tokio-rs/tokio",
                    "html_url": "https://github.com/tokio-rs/tokio",
                    "description": "A runtime for writing reliable, asynchronous, and slim network applications with Rust",
                    "language": "Rust",
                    "stars": 26000,
                    "forks": 2400,
                    "open_issues": 150,
                    "license": "MIT",
                    "topics": ["rust", "async", "networking"],
                    "pushed_at": "2026-09-19T08:00:00Z",
                    "readme_summary": "An event-driven, non-blocking I/O platform for writing asynchronous applications with Rust.",
                },
                {
                    "repo_id": 3,
                    "full_name": "sample/micro-web",
                    "html_url": "https://github.com/sample/micro-web",
                    "description": "Minimalist micro web framework written in Python for small scripts",
                    "language": "Python",
                    "stars": 45,
                    "forks": 4,
                    "open_issues": 2,
                    "license": "Apache-2.0",
                    "topics": ["python", "web", "microframework"],
                    "pushed_at": "2026-09-15T12:00:00Z",
                    "readme_summary": "Ultra-lightweight micro web framework for Python.",
                },
            ]
        }

        ingest_resp = await client.post("/api/v1/internal/ingest", json=ingest_payload)
        assert ingest_resp.status_code == 201
        data = ingest_resp.json()
        assert data["inserted_count"] == 3

        # 2. Search with semantic relevance (Python web framework)
        search_payload = {
            "query": "async python web framework for building REST APIs",
            "popularity_weight": 0.5,
            "limit": 10,
            "offset": 0,
        }
        search_resp = await client.post("/api/v1/search", json=search_payload)
        assert search_resp.status_code == 200
        search_data = search_resp.json()
        assert search_data["total"] >= 1
        items = search_data["items"]
        assert len(items) > 0

        # FastAPI should be ranked #1 due to strong semantic match + high popularity
        top_repo = items[0]
        assert top_repo["full_name"] == "tiangolo/fastapi"
        assert top_repo["scores"]["strategy"] == "MultiplicativeGateStrategy"
        assert top_repo["scores"]["popularity_score"] > 0.8

        # 3. Filter by Language = "Rust"
        rust_search_payload = {
            "query": "asynchronous runtime",
            "filters": {"language": "Rust"},
            "limit": 10,
        }
        rust_resp = await client.post("/api/v1/search", json=rust_search_payload)
        assert rust_resp.status_code == 200
        rust_data = rust_resp.json()
        assert len(rust_data["items"]) == 1
        assert rust_data["items"][0]["full_name"] == "tokio-rs/tokio"

        # 4. Filter by min_stars = 50000 (only FastAPI should match)
        stars_filter_payload = {
            "query": "web framework",
            "filters": {"min_stars": 50000},
            "limit": 10,
        }
        stars_resp = await client.post("/api/v1/search", json=stars_filter_payload)
        assert stars_resp.status_code == 200
        stars_data = stars_resp.json()
        assert len(stars_data["items"]) == 1
        assert stars_data["items"][0]["full_name"] == "tiangolo/fastapi"
