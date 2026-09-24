"""Unit and integration tests for Skill-Aware AI Chatbot."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.schemas.learning import SkillLevel
from backend.schemas.chatbot import (
    UserSkillProfile,
    ChatbotRequest,
    ChatbotResponse,
)
from backend.services.chatbot_agent import chatbot_agent_service


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
async def test_chatbot_service_beginner_calibration() -> None:
    """Test ChatbotAgentService response calibration for beginner developers."""
    profile = UserSkillProfile(
        skill_level=SkillLevel.BEGINNER,
        tech_stack=["Python"],
    )
    req = ChatbotRequest(
        question="What is a loop in Python?",
        skill_profile=profile,
    )
    res = await chatbot_agent_service.answer_question(req)

    assert isinstance(res, ChatbotResponse)
    assert res.question == req.question
    assert res.skill_level_used == SkillLevel.BEGINNER
    assert len(res.code_snippets) > 0
    assert len(res.suggested_followups) > 0
    assert res.duration_ms > 0
    assert "gemini-3.5-flash" in res.model_used


@pytest.mark.asyncio
async def test_chatbot_service_advanced_calibration() -> None:
    """Test ChatbotAgentService response calibration for advanced developers."""
    profile = UserSkillProfile(
        skill_level=SkillLevel.ADVANCED,
        tech_stack=["Python", "Rust", "Kubernetes"],
        experience_years=8.0,
    )
    req = ChatbotRequest(
        question="How do zero-copy network buffers impact async event loop throughput?",
        skill_profile=profile,
    )
    res = await chatbot_agent_service.answer_question(req)

    assert res.skill_level_used == SkillLevel.ADVANCED
    assert len(res.code_snippets) > 0
    assert res.code_snippets[0].explanation


@pytest.mark.asyncio
async def test_chatbot_api_endpoint() -> None:
    """Test POST /api/v1/chatbot/query endpoint integration."""
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
        response = await ac.post("/api/v1/chatbot/query", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["question"] == payload["question"]
    assert data["skill_level_used"] == "intermediate"
    assert "answer" in data
    assert isinstance(data["code_snippets"], list)
    assert isinstance(data["suggested_followups"], list)
    assert data["duration_ms"] > 0


@pytest.mark.asyncio
async def test_chatbot_api_validation_error() -> None:
    """Test HTTP 422 response when chatbot request fails validation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid question (length < 2)
        payload = {"question": "Q", "skill_profile": {"skill_level": "beginner"}}
        response = await ac.post("/api/v1/chatbot/query", json=payload)

    assert response.status_code == 422
