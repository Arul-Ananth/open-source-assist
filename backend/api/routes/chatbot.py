"""API router for Skill-Aware AI Chatbot."""

from fastapi import APIRouter, HTTPException, status
from backend.schemas.chatbot import ChatbotRequest, ChatbotResponse
from backend.services.chatbot_agent import chatbot_agent_service

router = APIRouter(prefix="/chatbot", tags=["Skill-Aware Chatbot"])


@router.post(
    "/query",
    response_model=ChatbotResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a technical question to the skill-aware AI chatbot",
    description=(
        "Executes a skill-calibrated AI chatbot workflow powered by LiteLLM (Gemini) and LangGraph. "
        "Answers technical questions with explanations, code snippets, documentation citations, "
        "and follow-up topics strictly tailored to the user's skill level, experience, and tech stack."
    ),
)
async def query_chatbot(request: ChatbotRequest) -> ChatbotResponse:
    """Answers user technical queries calibrated to their skill profile and context."""
    try:
        response = await chatbot_agent_service.answer_question(request)
        return response
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chatbot query: {str(exc)}",
        ) from exc
