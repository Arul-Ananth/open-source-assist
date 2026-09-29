"""FastAPI main application entrypoint for open-source-assist."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.admin import router as admin_router
from backend.api.auth import router as auth_router
from backend.api.routes.chatbot import router as chatbot_router
from backend.api.routes.events import router as events_router
from backend.api.routes.forum import router as forum_router
from backend.api.routes.learning import router as learning_router
from backend.api.routes.search import router as search_router
from backend.core.config import settings
from backend.core.database import engine
from backend.services.qdrant_service import qdrant_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        await qdrant_service.ensure_collection_exists()
    except Exception as exc:
        print(f"Notice: Qdrant startup collection check: {exc}")
    yield
    await qdrant_service.close()
    await engine.dispose()


app = FastAPI(
    title="Open Source Assist API",
    version="0.1.0",
    description="Backend for OpenSource Assist.",
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
app.include_router(search_router, prefix=settings.API_V1_PREFIX)
app.include_router(learning_router, prefix=settings.API_V1_PREFIX)
app.include_router(chatbot_router, prefix=settings.API_V1_PREFIX)
app.include_router(events_router, prefix=settings.API_V1_PREFIX)
app.include_router(forum_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "open-source-assist-backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=settings.SERVER_RELOAD,
    )
