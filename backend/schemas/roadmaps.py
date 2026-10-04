"""Pydantic schemas for roadmaps, steps, and progress tracking."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# ── Roadmap Steps ──

class StepCreate(BaseModel):
    day_number: int = Field(ge=1, description="Day this step belongs to.")
    title: str = Field(max_length=255, description="Step title.")
    description: str | None = Field(default=None, description="Step details.")
    expected_duration_hours: int | None = Field(
        default=None, ge=1, description="Expected hours to complete."
    )
    step_order: int = Field(ge=1, description="Display order within the roadmap.")


class StepUpdate(BaseModel):
    day_number: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    expected_duration_hours: int | None = None
    step_order: int | None = Field(default=None, ge=1)


class StepResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_id: int
    day_number: int
    title: str
    description: str | None
    expected_duration_hours: int | None
    step_order: int


# ── Roadmaps ──

class RoadmapCreate(BaseModel):
    name: str = Field(max_length=255, description="Roadmap title.")
    description: str | None = Field(default=None, description="Roadmap overview.")
    steps: list[StepCreate] | None = Field(
        default=None, description="Optionally create steps inline."
    )


class RoadmapUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None


class RoadmapResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime
    steps: list[StepResponse] = Field(default_factory=list)


class RoadmapListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    created_at: datetime


# ── User Progress ──

class ProgressCreate(BaseModel):
    user_id: uuid.UUID = Field(description="User UUID.")
    roadmap_id: int = Field(description="Target roadmap.")
    step_id: int = Field(description="Step being marked.")
    completed: bool = Field(default=True, description="Completion flag.")
    metadata: dict[str, Any] | None = Field(
        default=None, description="Extra payload (notes, time spent, etc.)."
    )


class ProgressUpdate(BaseModel):
    completed: bool = Field(description="New completion status.")
    metadata: dict[str, Any] | None = None


class ProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: uuid.UUID
    roadmap_id: int
    step_id: int
    completed: bool
    completed_at: datetime | None
    extra_metadata: dict[str, Any] | None = Field(alias="extra_metadata")
    step: StepResponse | None = None


class RoadmapProgressSummary(BaseModel):
    roadmap: RoadmapListResponse
    total_steps: int
    completed_steps: int
    percent_complete: float
    entries: list[ProgressResponse]
