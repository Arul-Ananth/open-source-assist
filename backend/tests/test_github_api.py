"""Unit and integration tests for GitHub proxy and contributors endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app
from backend.services.github_service import GitHubService, PRESEEDED_CONTRIBUTORS


@pytest.mark.asyncio
async def test_preseeded_contributors_linux():
    """Verify pre-seeded curated repositories return immediately without external call."""
    res = await GitHubService.get_contributors_batch(["torvalds/linux"])
    assert "torvalds/linux" in res["contributors"]
    contributors = res["contributors"]["torvalds/linux"]
    assert len(contributors) == 3
    assert contributors[0]["login"] == "torvalds"
    assert "torvalds.png" in contributors[0]["avatar_url"]


@pytest.mark.asyncio
async def test_github_contributors_api_route():
    """Test GET /api/v1/github/contributors endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/github/contributors?repos=torvalds/linux,tiangolo/fastapi")
        assert res.status_code == 200
        data = res.json()
        assert "contributors" in data
        assert "torvalds/linux" in data["contributors"]
        assert "tiangolo/fastapi" in data["contributors"]
        assert len(data["contributors"]["torvalds/linux"]) > 0
        assert data["rate_limited"] is False


@pytest.mark.asyncio
async def test_github_contributors_batch_post_route():
    """Test POST /api/v1/github/contributors/batch endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.post(
            "/api/v1/github/contributors/batch",
            json={"repos": ["torvalds/linux"]},
        )
        assert res.status_code == 200
        data = res.json()
        assert "torvalds/linux" in data["contributors"]


@pytest.mark.asyncio
async def test_github_user_profile_api_route():
    """Test GET /api/v1/github/user-profile/{username} endpoint."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/github/user-profile/mikelokinz")
        assert res.status_code == 200
        data = res.json()
        assert "profile" in data
        assert "stats" in data
        assert "badges" in data
        assert "heatmap" in data
        assert "recent_activity" in data
        assert data["profile"]["username"] == "mikelokinz"
        assert len(data["heatmap"]) == 365
        assert len(data["badges"]) >= 6
