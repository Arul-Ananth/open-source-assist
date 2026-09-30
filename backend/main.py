"""FastAPI main application entrypoint for open-source-assist."""

import asyncio
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.admin import router as admin_router
from backend.api.auth import router as auth_router
from backend.api.routes.chatbot import router as chatbot_router
from backend.api.routes.learning import router as learning_router
from backend.api.routes.search import router as search_router
from backend.api.routes.github import router as github_router
from backend.api.routes.projects import router as projects_router
from backend.api.routes.events import router as events_router
from backend.api.routes.airflow import router as airflow_router
from backend.api.routes.users import router as users_router
from backend.api.routes.roadmaps import router as roadmaps_router
from backend.core.config import settings
from backend.core.database import engine, init_db, SessionLocal
from backend.models.otp_model import OTP
from backend.services.qdrant_service import qdrant_service


async def _otp_purge_loop() -> None:
    """Periodically delete expired OTP rows every 60 seconds."""
    while True:
        await asyncio.sleep(60)
        try:
            async with SessionLocal() as session:
                count = await OTP.purge_expired(session)
                if count:
                    print(f"OTP purge: deleted {count} expired row(s)")
        except Exception as exc:
            print(f"OTP purge error: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown hooks."""
    try:
        await qdrant_service.ensure_collection_exists()
    except Exception as exc:
        print(f"Notice: Qdrant startup collection check: {exc}")

    try:
        await init_db()
    except Exception as exc:
        print(f"Notice: PostgreSQL startup table check: {exc}")

    purge_task = asyncio.create_task(_otp_purge_loop())

    yield

    purge_task.cancel()
    await qdrant_service.close()
    await engine.dispose()


app = FastAPI(
    title="Open Source Assist API",
    version="0.1.0",
    description=(
        "Production-grade backend for semantic search, exploration, and mentorship "
        "across open-source repositories using Qdrant vector database and AI workflows."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ALLOW_ORIGINS.split(",")],
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(search_router, prefix=settings.API_V1_PREFIX)
app.include_router(learning_router, prefix=settings.API_V1_PREFIX)
app.include_router(chatbot_router, prefix=settings.API_V1_PREFIX)
app.include_router(github_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(events_router, prefix=settings.API_V1_PREFIX)
app.include_router(airflow_router, prefix=settings.API_V1_PREFIX)
app.include_router(users_router, prefix=settings.API_V1_PREFIX)
app.include_router(roadmaps_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "open-source-assist-backend"}


if __name__ == "__main__":
    import uvicorn

    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    uvicorn.run(
        "backend.main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.SERVER_RELOAD,
    )
