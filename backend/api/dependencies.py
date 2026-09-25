"""FastAPI dependencies for dependency injection across routes."""

from typing import Any
from fastapi import Header
from backend.services.search_service import SearchService, search_service
from backend.services.qdrant_service import QdrantService, qdrant_service


def get_search_service() -> SearchService:
    """Provide the SearchService singleton instance."""
    return search_service


def get_qdrant_service() -> QdrantService:
    """Provide the QdrantService singleton instance."""
    return qdrant_service


async def get_optional_current_user(
    authorization: str | None = Header(
        default=None,
        description="Optional Bearer token for authenticated users.",
    ),
) -> dict[str, Any] | None:
    """Optional authentication stub for integration with the Auth/User module.

    When the authentication module is completed by teammates, this stub
    is connected to decode JWT tokens and provide current user context.
    Search remains completely functional for guest/unauthenticated users.
    """
    if authorization and authorization.startswith("Bearer "):
        # Placeholder for teammate auth decoding
        token = authorization.split(" ", 1)[1]
        return {"user_id": "authenticated_user", "token": token}
    return None

