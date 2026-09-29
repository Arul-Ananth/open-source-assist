"""FastAPI dependencies for dependency injection across routes."""

import uuid
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.core.jwt import decode_access_token
from backend.models.user_model import User
from backend.services.qdrant_service import QdrantService, qdrant_service
from backend.services.search_service import SearchService, search_service

bearer_security = HTTPBearer(auto_error=False)


def get_search_service() -> SearchService:
    return search_service


def get_qdrant_service() -> QdrantService:
    return qdrant_service


async def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, Any] | None:
    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, TypeError):
        return None

    user = await db.scalar(select(User).where(User.id == user_id, User.is_active.is_(True)))
    if user is None:
        return None

    return {
        "user_id": str(user.id),
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "account_status": user.account_status,
        "token": credentials.credentials,
    }


async def get_current_user(
    user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
) -> dict[str, Any]:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or user inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_admin(
    user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)],
) -> dict[str, Any]:
    """Require an authenticated user whose persisted role is administrator."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or user inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator role required",
        )
    return user
