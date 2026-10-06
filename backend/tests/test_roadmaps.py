"""Roadmap persistence and personalized progress tracking tests."""

import uuid
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.core.security import hash_password
from backend.main import app
from backend.models.user_model import User


@pytest_asyncio.fixture
async def roadmap_db():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()

    user_a = User(
        id=uuid.uuid4(),
        email="developer_a@example.com",
        username="developer_a",
        password_hash=hash_password("password-123"),
        role="user",
        account_status="active",
        is_active=True,
    )
    user_b = User(
        id=uuid.uuid4(),
        email="developer_b@example.com",
        username="developer_b",
        password_hash=hash_password("password-123"),
        role="user",
        account_status="active",
        is_active=True,
    )
    session.add(user_a)
    session.add(user_b)
    await session.commit()

    try:
        yield session, user_a, user_b
    finally:
        await session.close()
        await engine.dispose()


@pytest.mark.asyncio
async def test_personalized_roadmap_sync_and_progress(roadmap_db):
    session, user_a, user_b = roadmap_db

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ensure personalized roadmap exists
        payload = {
            "user_id": str(user_a.id),
            "language": "TypeScript",
            "skill_level": "beginner",
            "steps": [
                {
                    "day_number": 1,
                    "title": "Understanding Open Source and Git Basics",
                    "description": "Fork and clone workflow",
                    "expected_duration_hours": 1,
                    "step_order": 1,
                },
                {
                    "day_number": 2,
                    "title": "Setting Up a TypeScript Repository",
                    "description": "Configure tsconfig and tests",
                    "expected_duration_hours": 2,
                    "step_order": 2,
                },
            ],
        }

        resp = await client.post("/api/v1/roadmaps/personalized", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert "roadmap_id" in data
        roadmap_id = data["roadmap_id"]
        assert len(data["steps"]) == 2
        step_1_id = data["steps"][0]["id"]
        assert data["steps"][0]["completed"] is False
        assert data["steps"][1]["completed"] is False

        # 2. Mark step 1 completed for user_a
        progress_resp = await client.post(
            "/api/v1/progress",
            json={
                "user_id": str(user_a.id),
                "roadmap_id": roadmap_id,
                "step_id": step_1_id,
                "completed": True,
            },
        )
        assert progress_resp.status_code == 201
        prog_data = progress_resp.json()
        assert prog_data["completed"] is True
        assert prog_data["step_id"] == step_1_id

        # 3. Re-query personalized roadmap for user_a -> step 1 is completed!
        re_resp = await client.post("/api/v1/roadmaps/personalized", json=payload)
        assert re_resp.status_code == 200
        re_data = re_resp.json()
        assert re_data["steps"][0]["completed"] is True
        assert re_data["steps"][1]["completed"] is False

        # 4. Query for user_b -> step 1 should still be uncompleted!
        payload_b = {**payload, "user_id": str(user_b.id)}
        resp_b = await client.post("/api/v1/roadmaps/personalized", json=payload_b)
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        assert data_b["steps"][0]["completed"] is False

    app.dependency_overrides.clear()
