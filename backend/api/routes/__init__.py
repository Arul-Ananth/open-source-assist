"""Routes package."""

from backend.api.routes.search import router as search_router
from backend.api.routes.github import router as github_router
from backend.api.routes.projects import router as projects_router
from backend.api.routes.events import router as events_router

__all__ = [
    "search_router",
    "github_router",
    "projects_router",
    "events_router",
]

