from sqlalchemy.ext.asyncio import AsyncSession
from backend.models.posts import Post
from sqlalchemy import select
from uuid import UUID

async def create_post(db: AsyncSession, author_id: UUID, payload):
    post = Post(
        author_id=author_id,
        community_id=payload.community_id,
        title=payload.title,
        content=payload.content,
        excerpt=payload.excerpt,
    )
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


async def get_post(db: AsyncSession, post_id: UUID | str):
    post_uuid = UUID(str(post_id)) if not isinstance(post_id, UUID) else post_id
    q = await db.execute(select(Post).where(Post.id == post_uuid))
    return q.scalar_one_or_none()


async def list_posts(db: AsyncSession, community_id: UUID | str | None, limit: int = 20, offset: int = 0):
    try:
        q = select(Post).where(Post.status == "published")
        if community_id:
            community_uuid = UUID(str(community_id)) if not isinstance(community_id, UUID) else community_id
            q = q.where(Post.community_id == community_uuid)
        q = q.order_by(Post.published_at.desc().nullslast()).limit(limit).offset(offset)
        res = await db.execute(q)
        return res.scalars().all()
    except Exception:
        return []