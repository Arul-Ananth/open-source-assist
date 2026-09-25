"""Utility script to seed representative open-source repositories into Qdrant.

Can be run directly via:
    uv run python -m backend.scripts.seed_sample_data
"""

import asyncio
from backend.schemas.ingest import BatchRepoIngestRequest, RepoIngestItem
from backend.services.search_service import search_service
from backend.services.qdrant_service import qdrant_service

SAMPLE_REPOSITORIES = [
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
        topics=["fastapi", "asyncio", "python", "rest-api", "web", "pydantic"],
        pushed_at="2026-09-20T10:00:00Z",
        readme_summary="FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.8+ based on standard Python type hints.",
    ),
    RepoIngestItem(
        repo_id=141888062,
        full_name="encode/starlette",
        html_url="https://github.com/encode/starlette",
        description="The little ASGI framework that shines. High performance asyncio web services.",
        language="Python",
        stars=10200,
        forks=1100,
        open_issues=85,
        license="BSD-3-Clause",
        topics=["asgi", "asyncio", "python", "web-framework"],
        pushed_at="2026-09-18T14:00:00Z",
        readme_summary="Starlette is a lightweight ASGI framework/toolkit, which is ideal for building async web services in Python.",
    ),
    RepoIngestItem(
        repo_id=10360341,
        full_name="pallets/flask",
        html_url="https://github.com/pallets/flask",
        description="The Python micro framework for building web applications.",
        language="Python",
        stars=68000,
        forks=16000,
        open_issues=12,
        license="BSD-3-Clause",
        topics=["flask", "wsgi", "python", "microframework"],
        pushed_at="2026-09-15T09:00:00Z",
        readme_summary="Flask is a lightweight WSGI web application framework. It is designed to make getting started quick and easy.",
    ),
    RepoIngestItem(
        repo_id=160284197,
        full_name="tokio-rs/tokio",
        html_url="https://github.com/tokio-rs/tokio",
        description="A runtime for writing reliable, asynchronous, and slim network applications with the Rust programming language.",
        language="Rust",
        stars=27500,
        forks=2500,
        open_issues=160,
        license="MIT",
        topics=["rust", "async", "networking", "runtime"],
        pushed_at="2026-09-20T11:00:00Z",
        readme_summary="Tokio is an asynchronous runtime for the Rust programming language. It provides the building blocks needed for writing network applications.",
    ),
    RepoIngestItem(
        repo_id=233488820,
        full_name="qdrant/qdrant",
        html_url="https://github.com/qdrant/qdrant",
        description="Qdrant - High-performance, massive-scale Vector Database and Vector Search Engine for the next generation of AI.",
        language="Rust",
        stars=21000,
        forks=1400,
        open_issues=210,
        license="Apache-2.0",
        topics=["vector-search", "database", "rust", "neural-search", "embeddings"],
        pushed_at="2026-09-21T06:00:00Z",
        readme_summary="Qdrant is a vector similarity search engine and vector database. It provides a production-ready service with an API to store, search, and manage vectors with payload.",
    ),
    RepoIngestItem(
        repo_id=314159265,
        full_name="dev/tiny-asgi",
        html_url="https://github.com/dev/tiny-asgi",
        description="Ultra minimal single-file ASGI router for tiny microservices.",
        language="Python",
        stars=85,
        forks=6,
        open_issues=1,
        license="MIT",
        topics=["python", "asgi", "microservices"],
        pushed_at="2026-09-10T12:00:00Z",
        readme_summary="A lightweight 200-line ASGI router written for minimal microservices.",
    ),
]


async def seed_data() -> None:
    """Ensure collection exists and upsert sample repositories."""
    print("Connecting to Qdrant...")
    await qdrant_service.ensure_collection_exists()
    print(f"Ingesting {len(SAMPLE_REPOSITORIES)} sample repositories...")
    response = await search_service.ingest_repositories(
        BatchRepoIngestRequest(repositories=SAMPLE_REPOSITORIES)
    )
    print(
        f"Successfully indexed {response.inserted_count} repositories "
        f"into collection '{response.collection_name}' in {response.duration_ms}ms."
    )
    await qdrant_service.close()


if __name__ == "__main__":
    asyncio.run(seed_data())

