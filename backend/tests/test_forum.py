"""Forum persistence and moderation tests."""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.core.jwt import create_access_token
from backend.core.security import hash_password
from backend.main import app
from backend.models.user_model import User


@pytest_asyncio.fixture
async def forum_db():
    engine = create_async_engine("sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()
    admin = User(id=uuid.uuid4(), email="forum-admin@example.com", username="forum-admin", password_hash=hash_password("password-123"), role="admin", account_status="active", is_active=True)
    user = User(id=uuid.uuid4(), email="forum-user@example.com", username="forum-user", password_hash=hash_password("password-123"), role="user", account_status="active", is_active=True)
    session.add_all([admin, user])
    await session.commit()
    async def override_get_db():
        yield session
    app.dependency_overrides[get_db] = override_get_db
    yield session, admin, user
    app.dependency_overrides.clear()
    await session.close()
    await engine.dispose()


@pytest.mark.asyncio
async def test_forum_thread_reply_and_ban(forum_db) -> None:
    _session, admin, user = forum_db
    admin_token = create_access_token(str(admin.id))
    user_token = create_access_token(str(user.id))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post("/api/v1/forum/threads", headers={"Authorization": f"Bearer {user_token}"}, json={"title": "First thread", "content": "Hello forum"})
        assert created.status_code == 201
        thread_id = created.json()["id"]

        reply = await client.post(f"/api/v1/forum/threads/{thread_id}/replies", headers={"Authorization": f"Bearer {user_token}"}, json={"content": "A reply"})
        assert reply.status_code == 201

        banned = await client.post(f"/api/v1/admin/forum/bans/{user.id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert banned.status_code == 204

        blocked = await client.post("/api/v1/forum/threads", headers={"Authorization": f"Bearer {user_token}"}, json={"title": "Blocked", "content": "No"})
        assert blocked.status_code == 403
