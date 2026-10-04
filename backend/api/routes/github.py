"""Routes for triggering GitHub data synchronisation."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.github import ContributorSyncResponse, SyncResponse
from backend.services.github_client import GitHubAPIError, GitHubClient
from backend.services import github_sync_service

router = APIRouter(tags=["GitHub Sync"])


@router.post(
    "/sync",
    response_model=SyncResponse,
    summary="Sync repositories and contributors from GitHub",
)
async def sync(session: AsyncSession = Depends(get_db)) -> SyncResponse:
    """Fetch top public repositories from GitHub and upsert them along with
    their contributors into the PostgreSQL database."""
    try:
        async with GitHubClient() as client:
            result = await github_sync_service.sync_github(session, client)
        return SyncResponse(**result)
    except GitHubAPIError as error:
        await session.rollback()
        headers = (
            {"Retry-After": error.retry_after} if error.retry_after else None
        )
        raise HTTPException(
            status_code=error.status_code,
            detail=str(error),
            headers=headers,
        ) from error


@router.post(
    "/sync/contributors",
    response_model=ContributorSyncResponse,
    summary="Re-sync contributors for all existing projects",
)
async def sync_existing_contributors(
    session: AsyncSession = Depends(get_db),
) -> ContributorSyncResponse:
    """Refresh contributor data for every project already stored in the database."""
    try:
        async with GitHubClient() as client:
            count = await github_sync_service.sync_contributors(session, client)
        return ContributorSyncResponse(contributors=count)
    except GitHubAPIError as error:
        await session.rollback()
        headers = (
            {"Retry-After": error.retry_after} if error.retry_after else None
        )
        raise HTTPException(
            status_code=error.status_code,
            detail=str(error),
            headers=headers,
        ) from error
