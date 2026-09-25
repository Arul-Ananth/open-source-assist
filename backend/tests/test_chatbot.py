"""Unit and integration tests for Skill-Aware AI Chatbot."""

import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.config import settings
from backend.schemas.learning import SkillLevel, MaterialType, CitedMaterial
from backend.schemas.chatbot import (
    UserSkillProfile,
    CodeSnippet,
    ChatbotRequest,
    ChatbotResponse,
    StructuredChatbotOutput,
)
from backend.services.chatbot_agent import chatbot_agent_service


def _get_mock_llm_response() -> MagicMock:
    """Helper to mock LiteLLM completion response."""
    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.parsed = StructuredChatbotOutput(
        answer="Mocked skill-aware answer",
        code_snippets=[
            CodeSnippet(
                language="python",
                code="print('hello')",
                explanation="Basic print statement example.",
            )
        ],
        cited_references=[
            CitedMaterial(
                title="Mock Docs",
                url="https://docs.mock.org",
                material_type=MaterialType.OFFICIAL_DOCS,
                difficulty_level=SkillLevel.BEGINNER,
                snippet="Mock snippet",
                relevance_rationale="Mock rationale",
                topics=["python"],
            )
        ],
        suggested_followups=["What is next?"],
    )
    mock_resp.choices = [mock_choice]
    return mock_resp


@pytest.mark.asyncio
async def test_chatbot_request_validation() -> None:
    """Test Pydantic schema validation for ChatbotRequest and UserSkillProfile."""
    profile = UserSkillProfile(
        skill_level=SkillLevel.INTERMEDIATE,
        tech_stack=["Python", "FastAPI", "Docker"],
        experience_years=3.0,
        learning_goals=["Master microservice architecture"],
    )
    req = ChatbotRequest(
        question="How do I handle async error boundaries in FastAPI?",
        skill_profile=profile,
    )

    assert req.question == "How do I handle async error boundaries in FastAPI?"
    assert req.skill_profile.skill_level == SkillLevel.INTERMEDIATE
    assert "FastAPI" in req.skill_profile.tech_stack
    assert req.skill_profile.experience_years == 3.0


@pytest.mark.asyncio
async def test_chatbot_unconfigured_api_key_error(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that requesting chatbot without GEMINI_API_KEY raises ValueError / 400 Bad Request."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "question": "What is Python?",
            "skill_profile": {"skill_level": "beginner"},
        }
        response = await ac.post("/api/v1/chatbot/query", json=payload)

    assert response.status_code == 400
    assert "GEMINI_API_KEY is not configured" in response.json()["detail"]


@pytest.mark.asyncio
async def test_chatbot_service_execution(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test ChatbotAgentService execution when GEMINI_API_KEY is set."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock_key_123")

    profile = UserSkillProfile(
        skill_level=SkillLevel.BEGINNER,
        tech_stack=["Python"],
    )
    req = ChatbotRequest(
        question="What is a loop in Python?",
        skill_profile=profile,
    )

    with patch("litellm.acompletion", return_value=_get_mock_llm_response()):
        res = await chatbot_agent_service.answer_question(req)

    assert isinstance(res, ChatbotResponse)
    assert res.question == req.question
    assert res.skill_level_used == SkillLevel.BEGINNER
    assert len(res.code_snippets) > 0
    assert res.answer == "Mocked skill-aware answer"


@pytest.mark.asyncio
async def test_chatbot_api_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test POST /api/v1/chatbot/query endpoint integration with mocked LiteLLM."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock_key_123")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "question": "How to structure Pydantic v2 schemas for API contracts?",
            "skill_profile": {
                "skill_level": "intermediate",
                "tech_stack": ["Python", "FastAPI"],
                "experience_years": 2.5,
                "learning_goals": ["API contract design"],
            },
        }
        with patch("litellm.acompletion", return_value=_get_mock_llm_response()):
            response = await ac.post("/api/v1/chatbot/query", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == payload["question"]
    assert data["skill_level_used"] == "intermediate"
    assert data["answer"] == "Mocked skill-aware answer"
    assert len(data["code_snippets"]) > 0


@pytest.mark.asyncio
async def test_chatbot_api_validation_error() -> None:
    """Test HTTP 422 response when chatbot request fails validation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid question (length < 2)
        payload = {"question": "Q", "skill_profile": {"skill_level": "beginner"}}
        response = await ac.post("/api/v1/chatbot/query", json=payload)

    assert response.status_code == 422
