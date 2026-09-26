"""Initialize repository database and search index with mock/demo data.

Can be run via:
    uv run python devops/init_demo_data.py
"""

import asyncio
import datetime
import logging
import sys
from pathlib import Path
from typing import Any

# Ensure repository root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from backend.core.database import Base, SessionLocal, engine
from backend.core.security import hash_password
from backend.models.user_model import User
from backend.schemas.ingest import BatchRepoIngestRequest, RepoIngestItem
from backend.services.qdrant_service import qdrant_service
from backend.services.search_service import search_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("init_demo_data")

DEMO_USER_EMAIL = "demo@opensourceassist.dev"
DEMO_USER_USERNAME = "demo_contributor"
DEMO_USER_PASSWORD = "Password123!"

CURATED_DEMO_REPOSITORIES = [
    {
        "repo_id": 89229960,
        "full_name": "tiangolo/fastapi",
        "html_url": "https://github.com/tiangolo/fastapi",
        "description": "FastAPI framework, high performance, easy to learn, fast to code, ready for production.",
        "language": "Python",
        "stars": 76500,
        "forks": 6500,
        "open_issues": 420,
        "license": "MIT",
        "topics": ["fastapi", "python", "rest-api", "asyncio", "pydantic"],
        "readme_summary": "Modern, fast (high-performance), web framework for building APIs with Python 3.8+ based on standard Python type hints.",
    },
    {
        "repo_id": 595781362,
        "full_name": "shadcn-ui/ui",
        "html_url": "https://github.com/shadcn-ui/ui",
        "description": "Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
        "language": "TypeScript",
        "stars": 74200,
        "forks": 6200,
        "open_issues": 210,
        "license": "MIT",
        "topics": ["react", "tailwind", "radix-ui", "components", "design-system"],
        "readme_summary": "A set of beautifully designed and accessible React components created with Radix UI and Tailwind CSS.",
    },
    {
        "repo_id": 13340769,
        "full_name": "pallets/flask",
        "html_url": "https://github.com/pallets/flask",
        "description": "The Python micro framework for building web applications.",
        "language": "Python",
        "stars": 67800,
        "forks": 16200,
        "open_issues": 18,
        "license": "BSD-3-Clause",
        "topics": ["flask", "python", "wsgi", "web-framework", "microframework"],
        "readme_summary": "Flask is a lightweight WSGI web application framework in Python designed to make getting started quick and easy.",
    },
    {
        "repo_id": 78241477,
        "full_name": "pydantic/pydantic",
        "html_url": "https://github.com/pydantic/pydantic",
        "description": "Data validation using Python type hints, powered by Rust core.",
        "language": "Python",
        "stars": 23500,
        "forks": 2200,
        "open_issues": 310,
        "license": "MIT",
        "topics": ["pydantic", "validation", "typing", "rust", "dataclass"],
        "readme_summary": "Data validation and settings management using Python type hinting, with ultra-fast Rust validation core.",
    },
    {
        "repo_id": 7508411,
        "full_name": "tokio-rs/tokio",
        "html_url": "https://github.com/tokio-rs/tokio",
        "description": "A runtime for writing reliable, asynchronous, and slim applications with the Rust programming language.",
        "language": "Rust",
        "stars": 26800,
        "forks": 2450,
        "open_issues": 215,
        "license": "MIT",
        "topics": ["rust", "async", "networking", "futures", "runtime"],
        "readme_summary": "Tokio is an asynchronous runtime for the Rust programming language, providing event-driven I/O and concurrency.",
    },
    {
        "repo_id": 10270250,
        "full_name": "facebook/react",
        "html_url": "https://github.com/facebook/react",
        "description": "The library for web and native user interfaces.",
        "language": "JavaScript",
        "stars": 228000,
        "forks": 46200,
        "open_issues": 850,
        "license": "MIT",
        "topics": ["react", "javascript", "ui", "frontend", "declarative"],
        "readme_summary": "React is a JavaScript library for building user interfaces with declarative, component-based architecture.",
    },
    {
        "repo_id": 70107786,
        "full_name": "vercel/next.js",
        "html_url": "https://github.com/vercel/next.js",
        "description": "The React Framework for the Web.",
        "language": "TypeScript",
        "stars": 126000,
        "forks": 27300,
        "open_issues": 1600,
        "license": "MIT",
        "topics": ["nextjs", "react", "ssr", "typescript", "fullstack"],
        "readme_summary": "Next.js is the flexible React framework that gives you building blocks to create fast, full-stack web applications.",
    },
    {
        "repo_id": 718388836,
        "full_name": "astral-sh/uv",
        "html_url": "https://github.com/astral-sh/uv",
        "description": "An extremely fast Python package and project manager, written in Rust.",
        "language": "Rust",
        "stars": 42500,
        "forks": 1400,
        "open_issues": 310,
        "license": "MIT",
        "topics": ["python", "rust", "packaging", "pip", "virtualenv"],
        "readme_summary": "An extremely fast Python package manager and resolver, 10-100x faster than pip, written in Rust.",
    },
]


async def seed_demo_user() -> None:
    """Ensure database schema exists and inject the verified demo user account."""
    logger.info("Initializing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        existing = await session.scalar(
            select(User).where(User.email == DEMO_USER_EMAIL)
        )
        if existing:
            logger.info("Demo user already exists: %s", DEMO_USER_EMAIL)
            return

        demo_user = User(
            email=DEMO_USER_EMAIL,
            username=DEMO_USER_USERNAME,
            password_hash=hash_password(DEMO_USER_PASSWORD),
            is_active=True,
        )
        session.add(demo_user)
        await session.commit()
        logger.info(
            "Created pre-verified demo user: %s (Username: %s)",
            DEMO_USER_EMAIL,
            DEMO_USER_USERNAME,
        )


async def seed_qdrant_repositories() -> None:
    """Ingest curated demo repositories into Qdrant vector collection."""
    logger.info("Checking Qdrant vector database connectivity...")
    try:
        healthy = await qdrant_service.check_health()
        if not healthy:
            logger.warning(
                "Qdrant service reported unhealthy. Skipping vector embeddings ingestion."
            )
            return
        await qdrant_service.ensure_collection_exists()
    except Exception as exc:
        logger.warning(
            "Qdrant vector database is offline or unreachable (%s). "
            "Backend will gracefully return empty vector search results.",
            exc,
        )
        return

    logger.info("Ingesting %d curated repositories into Qdrant...", len(CURATED_DEMO_REPOSITORIES))
    items = [
        RepoIngestItem(
            repo_id=repo["repo_id"],
            full_name=repo["full_name"],
            html_url=repo["html_url"],
            description=repo["description"],
            language=repo["language"],
            stars=repo["stars"],
            forks=repo["forks"],
            open_issues=repo["open_issues"],
            license=repo["license"],
            topics=repo["topics"],
            pushed_at=datetime.datetime.now(datetime.timezone.utc),
            readme_summary=repo["readme_summary"],
        )
        for repo in CURATED_DEMO_REPOSITORIES
    ]

    try:
        response = await search_service.ingest_repositories(
            BatchRepoIngestRequest(repositories=items)
        )
        logger.info(
            "Successfully ingested %d repositories into Qdrant collection '%s' in %.2f ms",
            response.ingested_count,
            response.collection_name,
            response.duration_ms,
        )
    except Exception as exc:
        logger.error("Failed to ingest repositories into Qdrant: %s", exc)


async def main() -> None:
    logger.info("Starting OpenSource Assist demo data initialization...")
    await seed_demo_user()
    await seed_qdrant_repositories()
    await engine.dispose()
    await qdrant_service.close()

    print("\n" + "=" * 62)
    print("[OK] OpenSource Assist Demo Environment Initialized Successfully")
    print("=" * 62)
    print("Pre-verified Demo Login:")
    print(f"  Email:    {DEMO_USER_EMAIL}")
    print(f"  Password: {DEMO_USER_PASSWORD}")
    print("=" * 62 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
