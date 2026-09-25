"""Service layer for contributor search and listing queries."""

from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.contributor import Contributor
from backend.models.project import Project


async def get_project_contributors(
    session: AsyncSession,
    project_id: int,
    location: str | None = None,
) -> list[Contributor] | None:
    """Return contributors for a project, or None if the project doesn't exist."""
    exists = await session.execute(
        select(Project.id).where(Project.id == project_id)
    )
    if not exists.scalar_one_or_none():
        return None

    stmt = select(Contributor).where(Contributor.project_id == project_id)
    if location:
        stmt = stmt.order_by(
            case(
                (Contributor.location.ilike(f"%{location}%"), 0),
                else_=1,
            ),
            Contributor.contributions.desc(),
        )
    else:
        stmt = stmt.order_by(Contributor.contributions.desc())

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def search_contributors(
    session: AsyncSession,
    location: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Contributor]:
    stmt = select(Contributor)
    if location:
        stmt = stmt.order_by(
            case(
                (Contributor.location.ilike(f"%{location}%"), 0),
                else_=1,
            ),
            Contributor.contributions.desc(),
        )
    else:
        stmt = stmt.order_by(Contributor.contributions.desc())
    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())
