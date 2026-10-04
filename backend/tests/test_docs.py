"""Unit tests for Documentation Hub backend endpoints and personalized ranking."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.services.doc_service import doc_service


@pytest.mark.asyncio
async def test_get_doc_categories() -> None:
    """Test retrieving categories list."""
    categories = doc_service.get_categories()
    assert len(categories) == 9
    cat_ids = [c.id for c in categories]
    assert "getting-started" in cat_ids
    assert "git" in cat_ids
    assert "github" in cat_ids


@pytest.mark.asyncio
async def test_get_documents_default() -> None:
    """Test retrieving documentation without filters."""
    res = doc_service.get_documents()
    assert res.total_count == 44
    assert len(res.items) == 44
    assert res.is_personalized is False


@pytest.mark.asyncio
async def test_get_documents_category_filter() -> None:
    """Test category filtering."""
    res = doc_service.get_documents(category="git")
    assert res.total_count > 0
    assert all(item.category == "git" for item in res.items)


@pytest.mark.asyncio
async def test_get_documents_search_query() -> None:
    """Test keyword searching in title/tags."""
    res = doc_service.get_documents(query="rebase")
    assert res.total_count > 0
    titles = [item.title.lower() for item in res.items]
    assert any("rebase" in t or "history" in t for t in titles)


@pytest.mark.asyncio
async def test_get_documents_personalized_beginner() -> None:
    """Test personalization for beginner skill level."""
    res = doc_service.get_documents(user_skill_level="beginner")
    assert res.is_personalized is True
    assert res.user_skill_level == "beginner"
    # First item should be recommended for beginner
    recommended = [i for i in res.items if i.is_recommended]
    assert len(recommended) > 0
    assert "beginner" in (recommended[0].recommendation_reason or "").lower()


@pytest.mark.asyncio
async def test_get_documents_personalized_context() -> None:
    """Test personalization with user_context keywords."""
    res = doc_service.get_documents(
        user_skill_level="intermediate",
        user_context="Experienced in Python microservices, security scanning, and github-actions automation",
    )
    assert res.is_personalized is True
    recommended = [i for i in res.items if i.is_recommended]
    assert len(recommended) > 0


@pytest.mark.asyncio
async def test_api_docs_endpoint() -> None:
    """Test GET /api/v1/docs HTTP endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/docs")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "categories" in data
        assert data["total_count"] == 44


@pytest.mark.asyncio
async def test_api_docs_categories_endpoint() -> None:
    """Test GET /api/v1/docs/categories HTTP endpoint."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/docs/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 9
