"""API router for dynamic GitHub-grounded Skill Assessment and user_context synthesis."""

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.api.dependencies import get_optional_current_user
from backend.core.database import get_db
from backend.schemas.assessment import (
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    EvaluateAssessmentRequest,
    EvaluateAssessmentResponse,
)
from backend.services.assessment_service import assessment_service

router = APIRouter(prefix="/assessment", tags=["Skill Assessment"])


@router.post(
    "/generate",
    response_model=GenerateAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate dynamic GitHub-project-grounded skill assessment questions",
    description=(
        "Generates dynamic Multiple Choice Questions (MCQs) and Subjective open-ended questions "
        "tailored to the user's GitHub projects and tech stack using AI agent workflows."
    ),
)
async def generate_assessment_questions(
    request: GenerateAssessmentRequest,
    current_user: Annotated[dict | None, Depends(get_optional_current_user)] = None,
) -> GenerateAssessmentResponse:
    """Generates dynamic MCQ and subjective assessment questions based on user's GitHub project context."""
    try:
        response = await assessment_service.generate_assessment(request, current_user=current_user)
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate assessment questions: {str(exc)}",
        ) from exc


@router.post(
    "/evaluate",
    response_model=EvaluateAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate skill assessment responses and synthesize user_context",
    description=(
        "Evaluates submitted MCQ and subjective answers using LiteLLM (Gemini), calculates overall "
        "score breakdown, synthesizes a concise user_context string, and persists it in the User database table."
    ),
)
async def evaluate_assessment_submission(
    request: EvaluateAssessmentRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[dict | None, Depends(get_optional_current_user)] = None,
) -> EvaluateAssessmentResponse:
    """Evaluates assessment answers, generates user_context summary string, and updates the User record."""
    try:
        response = await assessment_service.evaluate_assessment(
            request=request, db=db, current_user=current_user
        )
        return response
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate assessment submission: {str(exc)}",
        ) from exc
