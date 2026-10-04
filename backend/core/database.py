"""SQLAlchemy engine and request-scoped database session dependency."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from backend.core.config import settings


class Base(DeclarativeBase):
    """Base class for all ORM models."""


engine: AsyncEngine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield one async SQLAlchemy session per request and close it afterward."""
    async with SessionLocal() as db:
        yield db


async def init_db() -> None:
    """Create all ORM tables if they do not exist yet and ensure schema sync."""
    import backend.models  # noqa: F401
    from sqlalchemy import text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if conn.dialect.name == "postgresql":
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(100);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS user_context VARCHAR(2000);"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS skill_level VARCHAR(50);"))
