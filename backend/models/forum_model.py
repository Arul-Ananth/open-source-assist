"""Forum database models."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Uuid, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ForumPost(Base):
    __tablename__ = "forum_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ForumBan(Base):
    __tablename__ = "forum_bans"
    __table_args__ = (UniqueConstraint("user_id", name="uq_forum_bans_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
