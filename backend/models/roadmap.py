"""Roadmap ORM model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.roadmap_step import RoadmapStep
    from backend.models.user_roadmap_progress import UserRoadmapProgress


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    steps: Mapped[list[RoadmapStep]] = relationship(
        back_populates="roadmap", cascade="all, delete-orphan"
    )
    progress_entries: Mapped[list[UserRoadmapProgress]] = relationship(
        back_populates="roadmap", cascade="all, delete-orphan"
    )
