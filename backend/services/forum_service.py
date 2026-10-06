"""Business logic for forum threads, replies, and forum-only moderation."""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.forum_model import ForumBan, ForumPost, ForumThread
from backend.models.user_model import User


class ForumService:
    """Coordinate persisted forum operations and moderation checks."""

    @staticmethod
    async def is_banned(db: AsyncSession, user_id: uuid.UUID) -> bool:
        return await db.scalar(select(ForumBan.id).where(ForumBan.user_id == user_id)) is not None

    @staticmethod
    async def assert_can_post(db: AsyncSession, user_id: uuid.UUID) -> None:
        if await ForumService.is_banned(db, user_id):
            raise ValueError("You are banned from the forum")

    @staticmethod
    async def get_thread(db: AsyncSession, thread_id: int) -> ForumThread | None:
        return await db.scalar(select(ForumThread).where(ForumThread.id == thread_id))

    @staticmethod
    async def create_thread(
        db: AsyncSession, author_id: uuid.UUID, title: str, content: str
    ) -> ForumThread:
        await ForumService.assert_can_post(db, author_id)
        thread = ForumThread(title=title.strip(), author_id=author_id)
        db.add(thread)
        await db.flush()
        db.add(ForumPost(thread_id=thread.id, author_id=author_id, content=content.strip()))
        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def add_reply(
        db: AsyncSession, thread_id: int, author_id: uuid.UUID, content: str
    ) -> ForumPost:
        await ForumService.assert_can_post(db, author_id)
        if await ForumService.get_thread(db, thread_id) is None:
            raise LookupError("Thread not found")
        post = ForumPost(thread_id=thread_id, author_id=author_id, content=content.strip())
        db.add(post)
        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def update_thread(
        db: AsyncSession, thread_id: int, author_id: uuid.UUID, title: str
    ) -> ForumThread:
        thread = await ForumService.get_thread(db, thread_id)
        if thread is None:
            raise LookupError("Thread not found")
        if thread.author_id != author_id:
            raise PermissionError("You can only edit your own threads")
        thread.title = title.strip()
        await db.commit()
        await db.refresh(thread)
        return thread

    @staticmethod
    async def delete_thread(
        db: AsyncSession, thread_id: int, author_id: uuid.UUID | None = None
    ) -> None:
        thread = await ForumService.get_thread(db, thread_id)
        if thread is None:
            raise LookupError("Thread not found")
        if author_id is not None and thread.author_id != author_id:
            raise PermissionError("You can only delete your own threads")
        await db.execute(delete(ForumPost).where(ForumPost.thread_id == thread_id))
        await db.delete(thread)
        await db.commit()

    @staticmethod
    async def update_post(
        db: AsyncSession, thread_id: int, post_id: int, author_id: uuid.UUID, content: str
    ) -> ForumPost:
        post = await db.scalar(
            select(ForumPost).where(
                ForumPost.id == post_id,
                ForumPost.thread_id == thread_id,
            )
        )
        if post is None:
            raise LookupError("Post not found")
        if post.author_id != author_id:
            raise PermissionError("You can only edit your own posts")
        post.content = content.strip()
        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def delete_post(
        db: AsyncSession, thread_id: int, post_id: int, author_id: uuid.UUID
    ) -> None:
        post = await db.scalar(
            select(ForumPost).where(
                ForumPost.id == post_id,
                ForumPost.thread_id == thread_id,
            )
        )
        if post is None:
            raise LookupError("Post not found")
        if post.author_id != author_id:
            raise PermissionError("You can only delete your own posts")
        opening_post = await db.scalar(
            select(ForumPost.id)
            .where(ForumPost.thread_id == thread_id)
            .order_by(ForumPost.created_at.asc(), ForumPost.id.asc())
            .limit(1)
        )
        if post.id == opening_post:
            raise ValueError("Delete the thread to remove its opening post")
        await db.delete(post)
        await db.commit()

    @staticmethod
    async def ban_user(
        db: AsyncSession, target_user_id: uuid.UUID, acting_admin_id: uuid.UUID
    ) -> None:
        if target_user_id == acting_admin_id:
            raise ValueError("An administrator cannot ban themselves")
        target = await db.scalar(select(User).where(User.id == target_user_id))
        if target is None:
            raise LookupError("User not found")
        if target.role == "admin":
            raise ValueError("Administrators cannot be forum-banned")
        if not await ForumService.is_banned(db, target_user_id):
            db.add(ForumBan(user_id=target_user_id))
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

    @staticmethod
    async def list_threads(
        db: AsyncSession, limit: int = 50, offset: int = 0
    ) -> list[ForumThread]:
        result = await db.scalars(
            select(ForumThread)
            .order_by(ForumThread.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.all())

    @staticmethod
    async def load_posts(db: AsyncSession, thread_id: int) -> list[ForumPost]:
        result = await db.scalars(
            select(ForumPost)
            .where(ForumPost.thread_id == thread_id)
            .order_by(ForumPost.created_at.asc(), ForumPost.id.asc())
        )
        return list(result.all())