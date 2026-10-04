"""Routes for roadmaps, steps, and user progress tracking."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.roadmaps import (
    ProgressCreate,
    ProgressResponse,
    ProgressUpdate,
    RoadmapCreate,
    RoadmapListResponse,
    RoadmapProgressSummary,
    RoadmapResponse,
    RoadmapUpdate,
    StepCreate,
    StepResponse,
    StepUpdate,
)
from backend.services import roadmap_service

router = APIRouter(tags=["Roadmaps"])


# ── Roadmap CRUD ──


@router.post(
    "/roadmaps",
    response_model=RoadmapResponse,
    status_code=201,
    summary="Create a roadmap (optionally with steps)",
)
async def create_roadmap(
    payload: RoadmapCreate,
    session: AsyncSession = Depends(get_db),
) -> RoadmapResponse:
    roadmap = await roadmap_service.create_roadmap(session, payload)
    return RoadmapResponse.model_validate(roadmap)


@router.get(
    "/roadmaps",
    response_model=list[RoadmapListResponse],
    summary="List all roadmaps",
)
async def list_roadmaps(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> list[RoadmapListResponse]:
    roadmaps = await roadmap_service.list_roadmaps(session, limit, offset)
    return [RoadmapListResponse.model_validate(r) for r in roadmaps]


@router.get(
    "/roadmaps/{roadmap_id}",
    response_model=RoadmapResponse,
    summary="Get a roadmap with all steps",
)
async def get_roadmap(
    roadmap_id: int,
    session: AsyncSession = Depends(get_db),
) -> RoadmapResponse:
    roadmap = await roadmap_service.get_roadmap(session, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return RoadmapResponse.model_validate(roadmap)


@router.patch(
    "/roadmaps/{roadmap_id}",
    response_model=RoadmapResponse,
    summary="Update roadmap name or description",
)
async def update_roadmap(
    roadmap_id: int,
    payload: RoadmapUpdate,
    session: AsyncSession = Depends(get_db),
) -> RoadmapResponse:
    roadmap = await roadmap_service.update_roadmap(session, roadmap_id, payload)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return RoadmapResponse.model_validate(roadmap)


@router.delete(
    "/roadmaps/{roadmap_id}",
    status_code=204,
    summary="Delete a roadmap and all its steps",
)
async def delete_roadmap(
    roadmap_id: int,
    session: AsyncSession = Depends(get_db),
) -> None:
    deleted = await roadmap_service.delete_roadmap(session, roadmap_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Roadmap not found")


# ── Steps CRUD ──


@router.post(
    "/roadmaps/{roadmap_id}/steps",
    response_model=StepResponse,
    status_code=201,
    summary="Add a step to a roadmap",
)
async def add_step(
    roadmap_id: int,
    payload: StepCreate,
    session: AsyncSession = Depends(get_db),
) -> StepResponse:
    step = await roadmap_service.add_step(session, roadmap_id, payload)
    if not step:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return StepResponse.model_validate(step)


@router.patch(
    "/roadmaps/{roadmap_id}/steps/{step_id}",
    response_model=StepResponse,
    summary="Update a step",
)
async def update_step(
    roadmap_id: int,
    step_id: int,
    payload: StepUpdate,
    session: AsyncSession = Depends(get_db),
) -> StepResponse:
    step = await roadmap_service.update_step(session, roadmap_id, step_id, payload)
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    return StepResponse.model_validate(step)


@router.delete(
    "/roadmaps/{roadmap_id}/steps/{step_id}",
    status_code=204,
    summary="Delete a step",
)
async def delete_step(
    roadmap_id: int,
    step_id: int,
    session: AsyncSession = Depends(get_db),
) -> None:
    deleted = await roadmap_service.delete_step(session, roadmap_id, step_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Step not found")


# ── User Progress ──


@router.post(
    "/progress",
    response_model=ProgressResponse,
    status_code=201,
    summary="Record or update step completion",
)
async def upsert_progress(
    payload: ProgressCreate,
    session: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    entry = await roadmap_service.upsert_progress(session, payload)
    return ProgressResponse.model_validate(entry)


@router.patch(
    "/progress/{progress_id}",
    response_model=ProgressResponse,
    summary="Toggle completion status",
)
async def update_progress(
    progress_id: int,
    payload: ProgressUpdate,
    session: AsyncSession = Depends(get_db),
) -> ProgressResponse:
    entry = await roadmap_service.update_progress(session, progress_id, payload)
    if not entry:
        raise HTTPException(status_code=404, detail="Progress entry not found")
    return ProgressResponse.model_validate(entry)


@router.get(
    "/users/{user_id}/progress",
    response_model=list[ProgressResponse],
    summary="Get all progress entries for a user",
)
async def get_user_progress(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> list[ProgressResponse]:
    entries = await roadmap_service.get_user_progress(session, user_id)
    return [ProgressResponse.model_validate(e) for e in entries]


@router.get(
    "/users/{user_id}/roadmaps/{roadmap_id}/progress",
    response_model=RoadmapProgressSummary,
    summary="Get progress summary for a user on a specific roadmap",
)
async def get_roadmap_progress(
    user_id: uuid.UUID,
    roadmap_id: int,
    session: AsyncSession = Depends(get_db),
) -> RoadmapProgressSummary:
    summary = await roadmap_service.get_roadmap_progress_summary(
        session, user_id, roadmap_id
    )
    if not summary:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return RoadmapProgressSummary.model_validate(summary)
