"""API endpoints for Documentation Hub and personalized documentation recommendations."""

from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query, status

from backend.api.dependencies import get_optional_current_user
from backend.schemas.docs import DocCategoryResponse, DocsCatalogResponse
from backend.services.doc_service import doc_service

router = APIRouter(prefix="/docs", tags=["Documentation Hub"])


@router.get(
    "/categories",
    response_model=list[DocCategoryResponse],
    status_code=status.HTTP_200_OK,
    summary="List all documentation categories",
)
async def list_categories() -> list[DocCategoryResponse]:
    """Retrieve catalog categories for official documentation."""
    return doc_service.get_categories()


@router.get(
    "",
    response_model=DocsCatalogResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch official documentation catalog tailored to user profile",
)
async def get_documents(
    category: Annotated[str | None, Query(description="Filter by category slug")] = None,
    q: Annotated[str | None, Query(alias="query", description="Search query across documentation")] = None,
    current_user: Annotated[dict[str, Any] | None, Depends(get_optional_current_user)] = None,
) -> DocsCatalogResponse:
    """Fetch official docs catalog with personalization based on user's assessed skill level and context."""
    skill_level = current_user.get("skill_level") if current_user else None
    user_context = current_user.get("user_context") if current_user else None

    return doc_service.get_documents(
        category=category,
        query=q,
        user_skill_level=skill_level,
        user_context=user_context,
    )
