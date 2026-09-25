"""Routes for browsing synced projects and contributors."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.github import ContributorResponse, ProjectResponse
from backend.services import contributor_service, project_service

router = APIRouter(tags=["Projects"])


@router.get(
    "/projects",
    response_model=list[ProjectResponse],
    summary="List synced GitHub projects",
)
async def list_projects(
    difficulty: str | None = Query(
        default=None,
        pattern="^(student|beginner|intermediate|advanced)$",
        description="Filter by difficulty classification.",
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Page size."),
    offset: int = Query(default=0, ge=0, description="Page offset."),
    session: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    """Return projects ordered by star count, optionally filtered by difficulty."""
    return await project_service.list_projects(session, difficulty, limit, offset)


@router.get(
    "/projects/{project_id}/contributors",
    response_model=list[ContributorResponse],
    summary="List contributors for a project",
)
async def project_contributors(
    project_id: int,
    location: str | None = Query(
        default=None,
        description="Prioritise contributors matching this location.",
    ),
    session: AsyncSession = Depends(get_db),
) -> list[ContributorResponse]:
    """Return contributors for a project, with optional location-priority sorting."""
    result = await contributor_service.get_project_contributors(
        session, project_id, location
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return result


@router.get(
    "/contributors",
    response_model=list[ContributorResponse],
    summary="Search all contributors",
)
async def search_contributors(
    location: str | None = Query(
        default=None,
        description="Prioritise contributors matching this location.",
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Page size."),
    offset: int = Query(default=0, ge=0, description="Page offset."),
    session: AsyncSession = Depends(get_db),
) -> list[ContributorResponse]:
    """Return contributors across all projects with optional location-priority sorting."""
    return await contributor_service.search_contributors(
        session, location, limit, offset
    )
