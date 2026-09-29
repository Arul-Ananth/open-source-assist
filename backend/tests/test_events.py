"""Event API tests."""

import uuid
from datetime import date

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
async def event_db():
    engine = create_async_engine("sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()
    admin = User(id=uuid.uuid4(), email="events-admin@example.com", username="events-admin", password_hash=hash_password("password-123"), role="admin", account_status="active", is_active=True)
    session.add(admin)
    await session.commit()
    async def override_get_db():
        yield session
    app.dependency_overrides[get_db] = override_get_db
    yield session, admin
    app.dependency_overrides.clear()
    await session.close()
    await engine.dispose()


@pytest.mark.asyncio
async def test_admin_event_crud_and_public_read(event_db) -> None:
    _session, admin = event_db
    token = create_access_token(str(admin.id))
    transport = ASGITransport(app=app)
    payload = {"name": "Open Source Sprint 2026", "type": "Hackathon", "date": date.today().isoformat(), "time": "18:30", "mode": "Online", "location": "", "organizer": "Open Source India"}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post("/api/v1/admin/events", json=payload, headers={"Authorization": f"Bearer {token}"})
        assert created.status_code == 201
        event_id = created.json()["id"]

        public = await client.get("/api/v1/events")
        assert public.status_code == 200
        assert any(item["id"] == event_id for item in public.json()["events"])

        deleted = await client.delete(f"/api/v1/admin/events/{event_id}", headers={"Authorization": f"Bearer {token}"})
        assert deleted.status_code == 204
