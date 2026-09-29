"""Administrator role and moderation API tests."""

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
        username="user",
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


@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_users(admin_db) -> None:
    _session, _admin, user = admin_db
    token = create_access_token(str(user.id))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_promote_user(admin_db) -> None:
    _session, admin, user = admin_db
    token = create_access_token(str(admin.id))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/admin/users/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "admin"},
        )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_new_user_defaults_to_user(admin_db) -> None:
    _session, admin, _user = admin_db
    token = create_access_token(str(admin.id))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
