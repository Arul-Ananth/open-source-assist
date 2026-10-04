"""Service layer for project listing queries."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.project import Project


async def list_projects(
    session: AsyncSession,
    difficulty: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Project]:
    stmt = select(Project).order_by(Project.stars.desc())
    if difficulty:
        stmt = stmt.where(Project.difficulty == difficulty)
    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())
