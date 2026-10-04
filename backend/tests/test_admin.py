"""Administrator, event, and forum persistence API tests."""

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
from backend.services.admin_service import AdminService


@pytest_asyncio.fixture
async def admin_db():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()
    admin = User(
        id=uuid.uuid4(),
        email="admin@example.com",
        username="admin",
        password_hash=hash_password("password-123"),
        role="admin",
        account_status="active",
        is_active=True,
    )
    user = User(
        id=uuid.uuid4(),
        email="user@example.com",
        username="contributor",
        password_hash=hash_password("password-123"),
        role="user",
        account_status="active",
        is_active=True,
    )
    session.add_all([admin, user])
    await session.commit()

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    yield session, admin, user
    app.dependency_overrides.clear()
    await session.close()
    await engine.dispose()


def _client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(str(user.id))}"}


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_api(admin_db) -> None:
    _session, _admin, user = admin_db
    async with _client() as client:
        response = await client.get("/api/v1/admin/users", headers=_headers(user))
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_promote_user_and_cannot_demote_last_admin(admin_db) -> None:
    _session, admin, user = admin_db
    async with _client() as client:
        promote = await client.patch(
            f"/api/v1/admin/users/{user.id}",
            headers=_headers(admin),
            json={"role": "admin"},
        )
        assert promote.status_code == 200
        assert promote.json()["role"] == "admin"

        modify_self = await client.patch(
            f"/api/v1/admin/users/{admin.id}",
            headers=_headers(admin),
            json={"role": "user"},
        )
        assert modify_self.status_code == 400
        assert "own account" in modify_self.json()["detail"]


@pytest.mark.asyncio
async def test_service_protects_last_admin_from_deletion(admin_db) -> None:
    session, admin, _user = admin_db
    with pytest.raises(ValueError, match="last administrator"):
        await AdminService.delete_user(session, admin)


@pytest.mark.asyncio
async def test_status_update_keeps_is_active_in_sync(admin_db) -> None:
    _session, admin, user = admin_db
    async with _client() as client:
        response = await client.patch(
            f"/api/v1/admin/users/{user.id}",
            headers=_headers(admin),
            json={"account_status": "suspended"},
        )
        assert response.status_code == 200
        assert response.json()["account_status"] == "suspended"
        profile = await client.get("/api/v1/auth/me", headers=_headers(user))
    assert profile.status_code == 401
    assert user.is_active is False


@pytest.mark.asyncio
async def test_admin_event_persists_and_regular_user_cannot_write(admin_db) -> None:
    _session, admin, user = admin_db
    event = {
        "name": "Community Workshop",
        "type": "Workshop",
        "date": "2026-11-18",
        "time": "15:00",
        "mode": "Online",
        "location": "",
        "organizer": "Open Source Assist",
    }
    async with _client() as client:
        denied = await client.post("/api/v1/admin/events", headers=_headers(user), json=event)
        assert denied.status_code == 403
        created = await client.post("/api/v1/admin/events", headers=_headers(admin), json=event)
        assert created.status_code == 201
        listed = await client.get("/api/v1/events")
    assert listed.status_code == 200
    assert listed.json()["events"][0]["name"] == event["name"]


@pytest.mark.asyncio
async def test_forum_ban_blocks_posts_but_not_account_login(admin_db) -> None:
    _session, admin, user = admin_db
    async with _client() as client:
        created = await client.post(
            "/api/v1/forum/threads",
            headers=_headers(user),
            json={"title": "First thread", "content": "Opening message"},
        )
        assert created.status_code == 201
        thread_id = created.json()["id"]

        banned = await client.post(
            f"/api/v1/admin/forum/bans/{user.id}", headers=_headers(admin)
        )
        assert banned.status_code == 204
        reply = await client.post(
            f"/api/v1/forum/threads/{thread_id}/replies",
            headers=_headers(user),
            json={"content": "A reply"},
        )
        assert reply.status_code == 403

        unbanned = await client.delete(
            f"/api/v1/admin/forum/bans/{user.id}", headers=_headers(admin)
        )
        assert unbanned.status_code == 204
        reply_after_unban = await client.post(
            f"/api/v1/forum/threads/{thread_id}/replies",
            headers=_headers(user),
            json={"content": "A reply"},
        )
    assert reply_after_unban.status_code == 201