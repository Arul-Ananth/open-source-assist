"""Routes package."""

from backend.api.routes.assessment import router as assessment_router
from backend.api.routes.chatbot import router as chatbot_router
from backend.api.routes.events import router as events_router
from backend.api.routes.github import router as github_router
from backend.api.routes.learning import router as learning_router
from backend.api.routes.projects import router as projects_router
from backend.api.routes.search import router as search_router

__all__ = [
    "assessment_router",
    "chatbot_router",
    "events_router",
    "github_router",
    "learning_router",
    "projects_router",
    "search_router",
]
