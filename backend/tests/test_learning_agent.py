"""Unit and integration tests for AI Learning Materials Generator & Citation Agent."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.schemas.learning import (
    SkillLevel,
    MaterialType,
    LearningMaterialRequest,
    LearningMaterialResponse,
)
from backend.services.learning_agent import learning_agent_service


@pytest.mark.asyncio
async def test_learning_material_request_validation() -> None:
    """Test Pydantic schema validation for LearningMaterialRequest."""
    req = LearningMaterialRequest(
        topic="FastAPI Async Microservices",
        skill_level=SkillLevel.INTERMEDIATE,
        user_context="2 years Python background",
        limit=3,
    )
    assert req.topic == "FastAPI Async Microservices"
    assert req.skill_level == SkillLevel.INTERMEDIATE
    assert req.limit == 3


@pytest.mark.asyncio
async def test_learning_agent_service_beginner_execution() -> None:
    """Test LearningAgentService execution for beginner skill level."""
    req = LearningMaterialRequest(
        topic="Docker Containerization",
        skill_level=SkillLevel.BEGINNER,
        user_context="New to DevOps",
        limit=2,
    )
    res = await learning_agent_service.generate_materials(req)

    assert isinstance(res, LearningMaterialResponse)
    assert res.topic == "Docker Containerization"
    assert res.skill_level == SkillLevel.BEGINNER
    assert len(res.modules) >= 2
    assert len(res.cited_materials) <= 2
    assert res.duration_ms > 0
    assert "gemini-3.5-flash" in res.model_used

    # Check cited materials structure
    for mat in res.cited_materials:
        assert mat.title
        assert mat.url.startswith("http")
        assert mat.snippet
        assert mat.relevance_rationale


@pytest.mark.asyncio
async def test_learning_agent_service_advanced_execution() -> None:
    """Test LearningAgentService execution for advanced skill level."""
    req = LearningMaterialRequest(
        topic="Distributed Systems Consensus",
        skill_level=SkillLevel.ADVANCED,
        limit=4,
    )
    res = await learning_agent_service.generate_materials(req)

    assert res.skill_level == SkillLevel.ADVANCED
    assert len(res.modules) >= 2
    assert "Distributed" in res.modules[0].title or "Internal" in res.modules[0].title


@pytest.mark.asyncio
async def test_learning_materials_api_endpoint() -> None:
    """Test POST /api/v1/learning/materials endpoint integration."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "topic": "Python Asyncio Internals",
            "skill_level": "intermediate",
            "user_context": "Seeking performance tuning advice",
            "limit": 3,
        }
        response = await ac.post("/api/v1/learning/materials", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Python Asyncio Internals"
    assert data["skill_level"] == "intermediate"
    assert "summary" in data
    assert isinstance(data["modules"], list)
    assert len(data["modules"]) > 0
    assert isinstance(data["cited_materials"], list)
    assert len(data["cited_materials"]) > 0
    assert data["duration_ms"] > 0


@pytest.mark.asyncio
async def test_learning_materials_api_validation_error() -> None:
    """Test HTTP 422 response when request payload fails validation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Invalid topic (length < 2)
        payload = {"topic": "A", "skill_level": "beginner"}
        response = await ac.post("/api/v1/learning/materials", json=payload)

    assert response.status_code == 422
