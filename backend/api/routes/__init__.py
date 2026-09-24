"""Routes package."""

from backend.api.routes.search import router as search_router
from backend.api.routes.learning import router as learning_router
from backend.api.routes.chatbot import router as chatbot_router

__all__ = ["search_router", "learning_router", "chatbot_router"]


