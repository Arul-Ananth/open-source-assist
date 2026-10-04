"""Service layer for roadmaps, steps, and user progress."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.roadmap import Roadmap
from backend.models.roadmap_step import RoadmapStep
from backend.models.user_roadmap_progress import UserRoadmapProgress
from backend.schemas.roadmaps import (
    ProgressCreate,
    ProgressUpdate,
    RoadmapCreate,
    RoadmapUpdate,
    StepCreate,
    StepUpdate,
)


# ── Roadmaps ──


async def create_roadmap(session: AsyncSession, payload: RoadmapCreate) -> Roadmap:
    roadmap = Roadmap(name=payload.name, description=payload.description)
    session.add(roadmap)
    await session.flush()

    if payload.steps:
        for s in payload.steps:
            session.add(
                RoadmapStep(
                    roadmap_id=roadmap.id,
                    day_number=s.day_number,
                    title=s.title,
                    description=s.description,
                    expected_duration_hours=s.expected_duration_hours,
                    step_order=s.step_order,
                )
            )

    await session.commit()
    return await get_roadmap(session, roadmap.id)  # type: ignore[return-value]


async def list_roadmaps(
    session: AsyncSession, limit: int = 50, offset: int = 0
) -> list[Roadmap]:
    result = await session.execute(
        select(Roadmap).order_by(Roadmap.created_at.desc()).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


async def get_roadmap(session: AsyncSession, roadmap_id: int) -> Roadmap | None:
    result = await session.execute(
        select(Roadmap)
        .options(selectinload(Roadmap.steps))
        .where(Roadmap.id == roadmap_id)
    )
    return result.scalar_one_or_none()


async def update_roadmap(
    session: AsyncSession, roadmap_id: int, payload: RoadmapUpdate
) -> Roadmap | None:
    roadmap = await get_roadmap(session, roadmap_id)
    if not roadmap:
        return None
    if payload.name is not None:
        roadmap.name = payload.name
    if payload.description is not None:
        roadmap.description = payload.description
    await session.commit()
    await session.refresh(roadmap)
    return roadmap


async def delete_roadmap(session: AsyncSession, roadmap_id: int) -> bool:
    roadmap = await get_roadmap(session, roadmap_id)
    if not roadmap:
        return False
    await session.delete(roadmap)
    await session.commit()
    return True


# ── Steps ──


async def add_step(
    session: AsyncSession, roadmap_id: int, payload: StepCreate
) -> RoadmapStep | None:
    roadmap = await get_roadmap(session, roadmap_id)
    if not roadmap:
        return None
    step = RoadmapStep(
        roadmap_id=roadmap_id,
        day_number=payload.day_number,
        title=payload.title,
        description=payload.description,
        expected_duration_hours=payload.expected_duration_hours,
        step_order=payload.step_order,
    )
    session.add(step)
    await session.commit()
    await session.refresh(step)
    return step


async def update_step(
    session: AsyncSession, roadmap_id: int, step_id: int, payload: StepUpdate
) -> RoadmapStep | None:
    result = await session.execute(
        select(RoadmapStep).where(
            RoadmapStep.id == step_id, RoadmapStep.roadmap_id == roadmap_id
        )
    )
    step = result.scalar_one_or_none()
    if not step:
        return None
    for field in ("day_number", "title", "description", "expected_duration_hours", "step_order"):
        value = getattr(payload, field)
        if value is not None:
            setattr(step, field, value)
    await session.commit()
    await session.refresh(step)
    return step


async def delete_step(session: AsyncSession, roadmap_id: int, step_id: int) -> bool:
    result = await session.execute(
        select(RoadmapStep).where(
            RoadmapStep.id == step_id, RoadmapStep.roadmap_id == roadmap_id
        )
    )
    step = result.scalar_one_or_none()
    if not step:
        return False
    await session.delete(step)
    await session.commit()
    return True


# ── Progress ──


async def upsert_progress(
    session: AsyncSession, payload: ProgressCreate
) -> UserRoadmapProgress:
    result = await session.execute(
        select(UserRoadmapProgress).where(
            UserRoadmapProgress.user_id == payload.user_id,
            UserRoadmapProgress.roadmap_id == payload.roadmap_id,
            UserRoadmapProgress.step_id == payload.step_id,
        )
    )
    entry = result.scalar_one_or_none()

    now = datetime.now(timezone.utc) if payload.completed else None

    if entry:
        entry.completed = payload.completed
        entry.completed_at = now
        entry.extra_metadata = payload.metadata
    else:
        entry = UserRoadmapProgress(
            user_id=payload.user_id,
            roadmap_id=payload.roadmap_id,
            step_id=payload.step_id,
            completed=payload.completed,
            completed_at=now,
            extra_metadata=payload.metadata,
        )
        session.add(entry)

    await session.commit()

    result = await session.execute(
        select(UserRoadmapProgress)
        .options(selectinload(UserRoadmapProgress.step))
        .where(UserRoadmapProgress.id == entry.id)
    )
    return result.scalar_one()


async def update_progress(
    session: AsyncSession, progress_id: int, payload: ProgressUpdate
) -> UserRoadmapProgress | None:
    result = await session.execute(
        select(UserRoadmapProgress).where(UserRoadmapProgress.id == progress_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        return None
    entry.completed = payload.completed
    entry.completed_at = datetime.now(timezone.utc) if payload.completed else None
    if payload.metadata is not None:
        entry.extra_metadata = payload.metadata
    await session.commit()

    result = await session.execute(
        select(UserRoadmapProgress)
        .options(selectinload(UserRoadmapProgress.step))
        .where(UserRoadmapProgress.id == entry.id)
    )
    return result.scalar_one()


async def get_user_progress(
    session: AsyncSession,
    user_id: uuid.UUID,
    roadmap_id: int | None = None,
) -> list[UserRoadmapProgress]:
    stmt = (
        select(UserRoadmapProgress)
        .options(selectinload(UserRoadmapProgress.step))
        .where(UserRoadmapProgress.user_id == user_id)
        .order_by(UserRoadmapProgress.roadmap_id, UserRoadmapProgress.step_id)
    )
    if roadmap_id is not None:
        stmt = stmt.where(UserRoadmapProgress.roadmap_id == roadmap_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_roadmap_progress_summary(
    session: AsyncSession, user_id: uuid.UUID, roadmap_id: int
) -> dict | None:
    roadmap = await get_roadmap(session, roadmap_id)
    if not roadmap:
        return None

    total = await session.execute(
        select(func.count()).select_from(RoadmapStep).where(
            RoadmapStep.roadmap_id == roadmap_id
        )
    )
    total_steps = total.scalar() or 0

    entries = await get_user_progress(session, user_id, roadmap_id)
    completed_steps = sum(1 for e in entries if e.completed)

    return {
        "roadmap": roadmap,
        "total_steps": total_steps,
        "completed_steps": completed_steps,
        "percent_complete": round(completed_steps / total_steps * 100, 1) if total_steps else 0.0,
        "entries": entries,
    }
