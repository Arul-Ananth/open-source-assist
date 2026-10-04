"""Routes for GitHub data synchronisation, cached contributor metadata, and user metrics."""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.github import ContributorSyncResponse, SyncResponse
from backend.services.github_client import GitHubAPIError, GitHubClient
from backend.services.github_service import GitHubService
from backend.services import github_sync_service

router = APIRouter(tags=["GitHub"])


class ContributorsBatchRequest(BaseModel):
    repos: list[str] = Field(..., description="List of repository full names (owner/repo).")


class ContributorItem(BaseModel):
    login: str
    avatar_url: str
    html_url: str
    contributions: int = 1


class ContributorsBatchResponse(BaseModel):
    contributors: dict[str, list[ContributorItem]]
    rate_limited: bool = False


# --- Synchronization Endpoints (Used by Airflow and Admin) ---

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


# --- Proxied & Cached GitHub Contributor Endpoints ---

@router.get(
    "/github/contributors",
    response_model=ContributorsBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Cached Repository Contributors",
)
async def get_contributors(
    repos: Annotated[
        str,
        Query(
            description="Comma-separated repository full names (e.g. 'torvalds/linux,tiangolo/fastapi')"
        ),
    ] = "",
) -> ContributorsBatchResponse:
    repo_list = [r.strip() for r in repos.split(",") if r.strip()]
    data = await GitHubService.get_contributors_batch(repo_list)
    return ContributorsBatchResponse(
        contributors=data["contributors"],
        rate_limited=data.get("rate_limited", False),
    )


@router.post(
    "/github/contributors/batch",
    response_model=ContributorsBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Batch Get Cached Repository Contributors",
)
async def post_contributors_batch(
    payload: ContributorsBatchRequest,
) -> ContributorsBatchResponse:
    data = await GitHubService.get_contributors_batch(payload.repos)
    return ContributorsBatchResponse(
        contributors=data["contributors"],
        rate_limited=data.get("rate_limited", False),
    )


# --- Aggregated User Profile & Contribution Heatmap ---

@router.get(
    "/github/user-profile/{username}",
    status_code=status.HTTP_200_OK,
    summary="Get Aggregated GitHub User Profile and Metrics",
)
async def get_user_profile(username: str) -> dict[str, Any]:
    """Fetch user GitHub profile, contribution metrics, streak, badges, and heatmap."""
    return await GitHubService.get_user_profile_stats(username)
