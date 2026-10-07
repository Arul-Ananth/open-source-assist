"""Persisted forum threads, posts, and forum-only moderation."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.core.database import Base

if TYPE_CHECKING:
    from backend.models.user_model import User


class ForumThread(Base):
    __tablename__ = "forum_threads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="general", server_default="general", index=True
    )
    reply_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    views_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_solved: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    accepted_answer_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Fast eager join for thread author
    author: Mapped[User] = relationship(lazy="joined", foreign_keys=[author_id])
    posts: Mapped[list[ForumPost]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", order_by="ForumPost.created_at.asc()"
    )


class ForumPost(Base):
    __tablename__ = "forum_posts"
    __table_args__ = (
        Index("ix_forum_posts_thread_created", "thread_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("forum_threads.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_opening_post: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    upvotes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    thread: Mapped[ForumThread] = relationship(back_populates="posts")
    author: Mapped[User] = relationship(lazy="joined", foreign_keys=[author_id])


class ForumBan(Base):
    __tablename__ = "forum_bans"
    __table_args__ = (UniqueConstraint("user_id", name="uq_forum_bans_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    banned_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped[User] = relationship(lazy="joined", foreign_keys=[user_id])