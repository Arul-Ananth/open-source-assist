"""RoadmapStep ORM model."""
from __future__ import annotations
from typing import TYPE_CHECKING
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.core.database import Base
if TYPE_CHECKING:
    from backend.models.roadmap import Roadmap
    from backend.models.user_roadmap_progress import UserRoadmapProgress
class RoadmapStep(Base):
    __tablename__ = "roadmap_steps"
    __table_args__ = (
        UniqueConstraint("roadmap_id", "day_number", name="uq_roadmap_day"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    roadmap_id: Mapped[int] = mapped_column(
        ForeignKey("roadmaps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_duration_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    roadmap: Mapped[Roadmap] = relationship(back_populates="steps")
    progress_entries: Mapped[list[UserRoadmapProgress]] = relationship(
        back_populates="step", cascade="all, delete-orphan"
    )