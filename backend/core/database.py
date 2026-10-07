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


engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield one async SQLAlchemy session per request and close it afterward."""
    async with SessionLocal() as db:
        yield db


async def init_db() -> None:
    """Create all ORM tables if they do not exist yet."""
    import backend.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if engine.dialect.name == "postgresql":
            from sqlalchemy import text

            migrations = [
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS is_solved BOOLEAN DEFAULT false;",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS accepted_answer_id INTEGER;",
                "ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();",
                "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS is_opening_post BOOLEAN DEFAULT false;",
                "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0;",
                "ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;",
                "ALTER TABLE forum_bans ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id) ON DELETE SET NULL;",
                "ALTER TABLE forum_bans ADD COLUMN IF NOT EXISTS reason VARCHAR(500);",
                "ALTER TABLE forum_bans ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;",
                "CREATE INDEX IF NOT EXISTS ix_forum_posts_thread_created ON forum_posts(thread_id, created_at);",
                "CREATE INDEX IF NOT EXISTS ix_forum_threads_category ON forum_threads(category);",
                "CREATE INDEX IF NOT EXISTS ix_forum_threads_last_activity ON forum_threads(last_activity_at);",
            ]
            for stmt in migrations:
                try:
                    await conn.execute(text(stmt))
                except Exception:
                    pass
