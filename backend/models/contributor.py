"""Contributor ORM model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.project import Project


class Contributor(Base):
    __tablename__ = "contributors"
    __table_args__ = (
        UniqueConstraint("project_id", "github_id", name="uq_project_contributor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    github_id: Mapped[int] = mapped_column(BigInteger, index=True)
    login: Mapped[str] = mapped_column(String(255), index=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    profile_url: Mapped[str] = mapped_column(String(500))
    contributions: Mapped[int] = mapped_column(Integer, default=0)
    rank: Mapped[int] = mapped_column(Integer, default=0)
    name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    blog: Mapped[str | None] = mapped_column(String(500))
    twitter_username: Mapped[str | None] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(String(255), index=True)
    bio: Mapped[str | None] = mapped_column(Text)
    company: Mapped[str | None] = mapped_column(String(255))
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    project: Mapped[Project] = relationship(back_populates="contributors")
