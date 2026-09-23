"""Authentication flow tests using an isolated in-memory SQLite database."""

from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.core.database import Base, get_db
from backend.main import app
from backend.models.otp_model import OTP
from backend.services import otp_service


@pytest_asyncio.fixture
async def auth_session(monkeypatch: pytest.MonkeyPatch):
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    session = session_factory()

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    sent_codes: list[str] = []
    async def capture_otp(email: str, otp: str) -> None:
        sent_codes.append(otp)

    monkeypatch.setattr(otp_service, "send_password_reset_otp", capture_otp)
    yield session, sent_codes
    app.dependency_overrides.clear()
    await session.close()
    await engine.dispose()


@pytest.mark.asyncio
async def test_signup_login_and_password_reset(auth_session) -> None:
    session, sent_codes = auth_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        signup = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "User@Example.com",
                "password": "old-password",
                "confirm_password": "old-password",
            },
        )
        assert signup.status_code == 201

        duplicate = await client.post(
            "/api/v1/auth/signup",
            json={
                "email": "user@example.com",
                "password": "old-password",
                "confirm_password": "old-password",
            },
        )
        assert duplicate.status_code == 400

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "old-password"},
        )
        assert login.status_code == 200
        assert login.json()["token_type"] == "bearer"

        forgot = await client.post(
            "/api/v1/auth/forgot-password", json={"email": "user@example.com"}
        )
        assert forgot.status_code == 200
        assert len(sent_codes) == 1

        reset = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": "user@example.com",
                "otp": sent_codes[0],
                "new_password": "new-password",
            },
        )
        assert reset.status_code == 200

        reused = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": "user@example.com",
                "otp": sent_codes[0],
                "new_password": "another-password",
            },
        )
        assert reused.status_code == 400

        new_login = await client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "new-password"},
        )
        assert new_login.status_code == 200

    record = await session.scalar(select(OTP))
    assert record is not None and record.is_used is True
    assert record.expires_at > datetime.now(timezone.utc).replace(tzinfo=None)