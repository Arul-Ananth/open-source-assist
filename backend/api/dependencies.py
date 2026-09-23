"""FastAPI dependencies for dependency injection across routes."""

from typing import Any
from fastapi import Header
from backend.core.jwt import decode_access_token
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
    """Decode an optional bearer token without blocking guest search."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            return {"user_id": payload["sub"], "token": token}
    return None

