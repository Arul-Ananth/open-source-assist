"""Public forum routes."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.models.forum_model import ForumPost, ForumThread
from backend.models.user_model import User
from backend.schemas.forum import (
    ForumPostCreateRequest,
    ForumPostItem,
    ForumThreadCreateRequest,
    ForumThreadItem,
    ForumThreadListResponse,
    ForumThreadSummary,
)
from backend.services.forum_service import ForumService

router = APIRouter(prefix="/forum", tags=["Forum"])


@router.get("/threads", response_model=ForumThreadListResponse)
async def list_threads(
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ForumThreadListResponse:
    rows = await db.execute(
        select(ForumThread, User, func.count(ForumPost.id))
        .join(User, User.id == ForumThread.author_id)
        .outerjoin(ForumPost, ForumPost.thread_id == ForumThread.id)
        .group_by(ForumThread.id, User.id)
        .order_by(ForumThread.created_at.desc())
        .limit(limit)
    )
    return ForumThreadListResponse(
        threads=[
            ForumThreadSummary(
                id=thread.id,
                title=thread.title,
                author_id=str(user.id),
                author_username=user.username,
                author_email=user.email,
                created_at=thread.created_at,
                reply_count=max(0, int(count) - 1),
            )
            for thread, user, count in rows.all()
        ]
    )


@router.get("/threads/{thread_id}", response_model=ForumThreadItem)
async def get_thread(
    thread_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumThreadItem:
    thread = await ForumService.get_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    author = await db.scalar(select(User).where(User.id == thread.author_id))
    if author is None:
        raise HTTPException(status_code=404, detail="Thread author not found")

    posts = await ForumService.load_posts(db, thread.id)
    post_items: list[ForumPostItem] = []
    for post in posts:
        post_author = await db.scalar(select(User).where(User.id == post.author_id))
        if post_author is None:
            continue
        post_items.append(
            ForumPostItem(
                id=post.id,
                author_id=str(post_author.id),
                author_username=post_author.username,
                author_email=post_author.email,
                content=post.content,
                created_at=post.created_at,
            )
        )

    return ForumThreadItem(
        id=thread.id,
        title=thread.title,
        author_id=str(author.id),
        author_username=author.username,
        author_email=author.email,
        created_at=thread.created_at,
        replies=post_items,
    )


@router.post("/threads", response_model=ForumThreadItem, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ForumThreadCreateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumThreadItem:
    try:
        thread = await ForumService.create_thread(
            db, uuid.UUID(current_user["user_id"]), payload.title, payload.content
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return await get_thread(thread.id, db)


@router.post("/threads/{thread_id}/replies", response_model=ForumPostItem, status_code=status.HTTP_201_CREATED)
async def add_reply(
    thread_id: int,
    payload: ForumPostCreateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumPostItem:
    try:
        post = await ForumService.add_reply(
            db, thread_id, uuid.UUID(current_user["user_id"]), payload.content
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    author = await db.scalar(select(User).where(User.id == post.author_id))
    if author is None:
        raise HTTPException(status_code=404, detail="Author not found")
    return ForumPostItem(
        id=post.id,
        author_id=str(author.id),
        author_username=author.username,
        author_email=author.email,
        content=post.content,
        created_at=post.created_at,
    )
