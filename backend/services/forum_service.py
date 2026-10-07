"""Business logic for forum threads, replies, and forum-only moderation."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.models.forum_model import ForumBan, ForumPost, ForumThread
from backend.models.user_model import User


class ForumService:
    """Coordinate persisted forum operations and moderation checks."""

    @staticmethod
    async def is_banned(db: AsyncSession, user_id: uuid.UUID) -> bool:
        ban = await db.scalar(select(ForumBan).where(ForumBan.user_id == user_id))
        if ban is None:
            return False
        if ban.expires_at is not None and ban.expires_at < datetime.now(timezone.utc):
            await db.delete(ban)
            await db.commit()
            return False
        return True

    @staticmethod
    async def assert_can_post(db: AsyncSession, user_id: uuid.UUID) -> None:
        if await ForumService.is_banned(db, user_id):
            raise ValueError("You are banned from the forum")

    @staticmethod
    async def get_thread(db: AsyncSession, thread_id: int) -> ForumThread | None:
        return await db.scalar(
            select(ForumThread)
            .where(ForumThread.id == thread_id)
            .options(selectinload(ForumThread.author))
        )

    @staticmethod
    async def get_thread_with_posts(db: AsyncSession, thread_id: int) -> ForumThread | None:
        """Load a thread and all of its posts along with their authors in one joined query."""
        return await db.scalar(
            select(ForumThread)
            .where(ForumThread.id == thread_id)
            .options(
                selectinload(ForumThread.author),
                selectinload(ForumThread.posts).selectinload(ForumPost.author),
            )
        )

    @staticmethod
    async def create_thread(
        db: AsyncSession,
        author_id: uuid.UUID,
        title: str,
        content: str,
        category: str = "general",
    ) -> ForumThread:
        await ForumService.assert_can_post(db, author_id)
        clean_title = title.strip()
        clean_content = content.strip()
        clean_cat = (category or "general").strip().lower()

        thread = ForumThread(
            title=clean_title,
            author_id=author_id,
            category=clean_cat,
            reply_count=0,
            views_count=0,
        )
        db.add(thread)
        await db.flush()

        opening_post = ForumPost(
            thread_id=thread.id,
            author_id=author_id,
            content=clean_content,
            is_opening_post=True,
            upvotes=0,
        )
        db.add(opening_post)
        await db.commit()

        # Re-fetch with loaded author relationship
        loaded = await ForumService.get_thread_with_posts(db, thread.id)
        if loaded is None:
            return thread
        return loaded

    @staticmethod
    async def add_reply(
        db: AsyncSession, thread_id: int, author_id: uuid.UUID, content: str
    ) -> ForumPost:
        await ForumService.assert_can_post(db, author_id)
        thread = await db.scalar(select(ForumThread).where(ForumThread.id == thread_id))
        if thread is None:
            raise LookupError("Thread not found")

        post = ForumPost(
            thread_id=thread_id,
            author_id=author_id,
            content=content.strip(),
            is_opening_post=False,
            upvotes=0,
        )
        db.add(post)

        # Atomically bump thread reply counter and last activity timestamp
        thread.reply_count = (thread.reply_count or 0) + 1
        thread.last_activity_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(post)

        # Ensure author is loaded
        author = await db.scalar(select(User).where(User.id == author_id))
        if author:
            post.author = author
        return post

    @staticmethod
    async def update_thread(
        db: AsyncSession,
        thread_id: int,
        author_id: uuid.UUID,
        title: str | None = None,
        category: str | None = None,
        is_solved: bool | None = None,
        accepted_answer_id: int | None = None,
        is_admin: bool = False,
    ) -> ForumThread:
        thread = await ForumService.get_thread(db, thread_id)
        if thread is None:
            raise LookupError("Thread not found")
        if not is_admin and thread.author_id != author_id:
            raise PermissionError("You can only edit your own threads")

        if title is not None:
            thread.title = title.strip()
        if category is not None:
            thread.category = category.strip().lower()
        if is_solved is not None:
            thread.is_solved = is_solved
        if accepted_answer_id is not None:
            thread.accepted_answer_id = accepted_answer_id
            thread.is_solved = True

        thread.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def delete_thread(
        db: AsyncSession,
        thread_id: int,
        author_id: uuid.UUID | None = None,
        is_admin: bool = False,
    ) -> None:
        thread = await ForumService.get_thread(db, thread_id)
        if thread is None:
            raise LookupError("Thread not found")
        if not is_admin and author_id is not None and thread.author_id != author_id:
            raise PermissionError("You can only delete your own threads")

        await db.delete(thread)
        await db.commit()

    @staticmethod
    async def update_post(
        db: AsyncSession,
        thread_id: int,
        post_id: int,
        author_id: uuid.UUID,
        content: str,
        is_admin: bool = False,
    ) -> ForumPost:
        post = await db.scalar(
            select(ForumPost)
            .where(ForumPost.id == post_id, ForumPost.thread_id == thread_id)
            .options(selectinload(ForumPost.author))
        )
        if post is None:
            raise LookupError("Post not found")
        if not is_admin and post.author_id != author_id:
            raise PermissionError("You can only edit your own posts")

        post.content = content.strip()
        post.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def delete_post(
        db: AsyncSession,
        thread_id: int,
        post_id: int,
        author_id: uuid.UUID,
        is_admin: bool = False,
    ) -> None:
        post = await db.scalar(
            select(ForumPost).where(ForumPost.id == post_id, ForumPost.thread_id == thread_id)
        )
        if post is None:
            raise LookupError("Post not found")
        if not is_admin and post.author_id != author_id:
            raise PermissionError("You can only delete your own posts")

        if post.is_opening_post:
            raise ValueError("The opening post cannot be deleted directly; delete the thread instead.")

        thread = await db.scalar(select(ForumThread).where(ForumThread.id == thread_id))
        if thread and thread.reply_count > 0:
            thread.reply_count -= 1

        await db.delete(post)
        await db.commit()

    @staticmethod
    async def upvote_post(db: AsyncSession, thread_id: int, post_id: int) -> int:
        post = await db.scalar(
            select(ForumPost).where(ForumPost.id == post_id, ForumPost.thread_id == thread_id)
        )
        if post is None:
            raise LookupError("Post not found")
        post.upvotes = (post.upvotes or 0) + 1
        await db.commit()
        return post.upvotes

    @staticmethod
    async def increment_views(db: AsyncSession, thread_id: int) -> None:
        thread = await db.scalar(select(ForumThread).where(ForumThread.id == thread_id))
        if thread:
            thread.views_count = (thread.views_count or 0) + 1
            await db.commit()

    @staticmethod
    async def list_threads(
        db: AsyncSession,
        category: str | None = None,
        search: str | None = None,
        sort: str = "activity",
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ForumThread], int]:
        query = select(ForumThread).options(selectinload(ForumThread.author))
        count_query = select(func.count(ForumThread.id))

        if category and category.strip().lower() not in ("all", ""):
            cat = category.strip().lower()
            query = query.where(ForumThread.category == cat)
            count_query = count_query.where(ForumThread.category == cat)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(ForumThread.title.ilike(term))
            count_query = count_query.where(ForumThread.title.ilike(term))

        if sort == "created":
            query = query.order_by(ForumThread.created_at.desc())
        elif sort == "views":
            query = query.order_by(ForumThread.views_count.desc())
        else:  # default activity / bumping
            query = query.order_by(ForumThread.last_activity_at.desc())

        query = query.limit(limit).offset(offset)

        total = await db.scalar(count_query) or 0
        result = await db.scalars(query)
        return list(result.all()), int(total)

    @staticmethod
    async def load_posts(db: AsyncSession, thread_id: int) -> list[ForumPost]:
        result = await db.scalars(
            select(ForumPost)
            .where(ForumPost.thread_id == thread_id)
            .options(selectinload(ForumPost.author))
            .order_by(ForumPost.created_at.asc(), ForumPost.id.asc())
        )
        return list(result.all())

    @staticmethod
    async def ban_user(
        db: AsyncSession,
        target_user_id: uuid.UUID,
        acting_admin_id: uuid.UUID,
        reason: str | None = None,
    ) -> None:
        if target_user_id == acting_admin_id:
            raise ValueError("An administrator cannot ban themselves")
        target = await db.scalar(select(User).where(User.id == target_user_id))
        if target is None:
            raise LookupError("User not found")
        if target.role == "admin":
            raise ValueError("Administrators cannot be forum-banned")
        if not await ForumService.is_banned(db, target_user_id):
            db.add(ForumBan(user_id=target_user_id, banned_by=acting_admin_id, reason=reason))
            await db.commit()

    @staticmethod
    async def unban_user(db: AsyncSession, target_user_id: uuid.UUID) -> None:
        await db.execute(delete(ForumBan).where(ForumBan.user_id == target_user_id))
        await db.commit()

    @staticmethod
    async def list_bans(db: AsyncSession) -> list[tuple[ForumBan, User]]:
        result = await db.execute(
            select(ForumBan, User)
            .join(User, User.id == ForumBan.user_id)
            .order_by(ForumBan.created_at.desc())
        )
        return list(result.all())