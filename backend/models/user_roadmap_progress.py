"""UserRoadmapProgress ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.roadmap import Roadmap
    from backend.models.roadmap_step import RoadmapStep
    from backend.models.user_model import User


class UserRoadmapProgress(Base):
    __tablename__ = "user_roadmap_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "roadmap_id", "step_id", name="uq_user_roadmap_step"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    roadmap_id: Mapped[int] = mapped_column(
        ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    step_id: Mapped[int] = mapped_column(
        ForeignKey("roadmap_steps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    extra_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSON().with_variant(JSONB, "postgresql"), nullable=True
    )

    user: Mapped[User] = relationship(back_populates="roadmap_progress")
    roadmap: Mapped[Roadmap] = relationship(back_populates="progress_entries")
    step: Mapped[RoadmapStep] = relationship(back_populates="progress_entries")
