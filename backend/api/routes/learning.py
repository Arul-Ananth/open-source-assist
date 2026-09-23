"""API router for AI Learning Materials Generator & Citation Agent."""

from fastapi import APIRouter, HTTPException, status
from backend.schemas.learning import (
    LearningMaterialRequest,
    LearningMaterialResponse,
)
from backend.services.learning_agent import learning_agent_service

router = APIRouter(prefix="/learning", tags=["Learning Materials Agent"])


@router.post(
    "/materials",
    response_model=LearningMaterialResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate skill-tailored learning materials with citeable sources",
    description=(
        "Executes an AI Agent workflow powered by Gemini API and LangGraph to generate "
        "personalized step-by-step learning modules and citeable online resources "
        "(official documentation, tutorials, articles, and open-source repositories) "
        "tailored strictly to the user's skill level."
    ),
)
async def generate_learning_materials(
    request: LearningMaterialRequest,
) -> LearningMaterialResponse:
    """Generates personalized learning materials and citeable resources tailored to user skill level."""
    try:
        response = await learning_agent_service.generate_materials(request)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate learning materials: {str(exc)}",
        ) from exc
