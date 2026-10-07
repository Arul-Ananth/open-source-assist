"""Public forum endpoints."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user, get_optional_current_user
from backend.core.database import get_db
from backend.models.forum_model import ForumPost, ForumThread
from backend.schemas.forum import (
    ForumPostCreateRequest,
    ForumPostItem,
    ForumPostUpdateRequest,
    ForumThreadCreateRequest,
    ForumThreadItem,
    ForumThreadListResponse,
    ForumThreadSummary,
    ForumThreadUpdateRequest,
)
from backend.services.forum_service import ForumService

router = APIRouter(prefix="/forum", tags=["Forum"])


def _to_post_item(post: ForumPost) -> ForumPostItem:
    author = getattr(post, "author", None)
    return ForumPostItem(
        id=post.id,
        thread_id=post.thread_id,
        author_id=str(post.author_id),
        author_username=author.username if author else None,
        author_email=author.email if author else "deleted@user.com",
        author_avatar_url=getattr(author, "avatar_url", None) if author else None,
        content=post.content,
        is_opening_post=getattr(post, "is_opening_post", False),
        upvotes=getattr(post, "upvotes", 0) or 0,
        created_at=post.created_at,
        updated_at=getattr(post, "updated_at", None),
    )


def _to_thread_summary(thread: ForumThread) -> ForumThreadSummary:
    author = getattr(thread, "author", None)
    return ForumThreadSummary(
        id=thread.id,
        title=thread.title,
        author_id=str(thread.author_id),
        author_username=author.username if author else None,
        author_email=author.email if author else "deleted@user.com",
        author_avatar_url=getattr(author, "avatar_url", None) if author else None,
        category=getattr(thread, "category", "general") or "general",
        reply_count=getattr(thread, "reply_count", 0) or 0,
        views_count=getattr(thread, "views_count", 0) or 0,
        is_solved=getattr(thread, "is_solved", False) or False,
        last_activity_at=getattr(thread, "last_activity_at", thread.created_at) or thread.created_at,
        created_at=thread.created_at,
    )


def _to_thread_item(thread: ForumThread) -> ForumThreadItem:
    author = getattr(thread, "author", None)
    replies = [_to_post_item(p) for p in (thread.posts or [])]
    return ForumThreadItem(
        id=thread.id,
        title=thread.title,
        author_id=str(thread.author_id),
        author_username=author.username if author else None,
        author_email=author.email if author else "deleted@user.com",
        author_avatar_url=getattr(author, "avatar_url", None) if author else None,
        category=getattr(thread, "category", "general") or "general",
        reply_count=getattr(thread, "reply_count", max(0, len(replies) - 1)) or 0,
        views_count=getattr(thread, "views_count", 0) or 0,
        is_solved=getattr(thread, "is_solved", False) or False,
        accepted_answer_id=getattr(thread, "accepted_answer_id", None),
        last_activity_at=getattr(thread, "last_activity_at", thread.created_at) or thread.created_at,
        created_at=thread.created_at,
        replies=replies,
    )


@router.get("/threads", response_model=ForumThreadListResponse)
async def list_threads(
    db: Annotated[AsyncSession, Depends(get_db)],
    category: Annotated[str | None, Query(description="Filter by topic category")] = None,
    search: Annotated[str | None, Query(description="Search term in title")] = None,
    sort: Annotated[str, Query(description="activity | created | views")] = "activity",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ForumThreadListResponse:
    """List forum threads with optional category and keyword search."""
    threads, total = await ForumService.list_threads(
        db, category=category, search=search, sort=sort, limit=limit, offset=offset
    )
    return ForumThreadListResponse(
        threads=[_to_thread_summary(t) for t in threads],
        total=total,
    )


@router.get("/threads/{thread_id}", response_model=ForumThreadItem)
async def get_thread(
    thread_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumThreadItem:
    """Return a forum thread with all opening and reply posts in one joined query."""
    thread = await ForumService.get_thread_with_posts(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    await ForumService.increment_views(db, thread_id)
    return _to_thread_item(thread)


@router.post("/threads", response_model=ForumThreadItem, status_code=status.HTTP_201_CREATED)
async def create_thread(
    payload: ForumThreadCreateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumThreadItem:
    """Create a forum thread and its opening post for the authenticated user."""
    try:
        thread = await ForumService.create_thread(
            db,
            author_id=uuid.UUID(current_user["user_id"]),
            title=payload.title,
            content=payload.content,
            category=payload.category,
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _to_thread_item(thread)


@router.patch("/threads/{thread_id}", response_model=ForumThreadItem)
async def update_thread(
    thread_id: int,
    payload: ForumThreadUpdateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumThreadItem:
    """Update a thread's title, category, or solved status by author or admin."""
    is_admin = current_user.get("role") == "admin"
    try:
        await ForumService.update_thread(
            db,
            thread_id=thread_id,
            author_id=uuid.UUID(current_user["user_id"]),
            title=payload.title,
            category=payload.category,
            is_solved=payload.is_solved,
            accepted_answer_id=payload.accepted_answer_id,
            is_admin=is_admin,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    refreshed = await ForumService.get_thread_with_posts(db, thread_id)
    if refreshed is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return _to_thread_item(refreshed)


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: int,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a thread and its posts by author or admin."""
    is_admin = current_user.get("role") == "admin"
    try:
        await ForumService.delete_thread(
            db,
            thread_id=thread_id,
            author_id=uuid.UUID(current_user["user_id"]),
            is_admin=is_admin,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/threads/{thread_id}/replies",
    response_model=ForumPostItem,
    status_code=status.HTTP_201_CREATED,
)
async def add_reply(
    thread_id: int,
    payload: ForumPostCreateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumPostItem:
    """Add a reply to a thread, automatically bumping thread activity."""
    try:
        post = await ForumService.add_reply(
            db,
            thread_id=thread_id,
            author_id=uuid.UUID(current_user["user_id"]),
            content=payload.content,
        )
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _to_post_item(post)


@router.patch(
    "/threads/{thread_id}/posts/{post_id}",
    response_model=ForumPostItem,
)
async def update_post(
    thread_id: int,
    post_id: int,
    payload: ForumPostUpdateRequest,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumPostItem:
    """Update a post by its author or admin."""
    is_admin = current_user.get("role") == "admin"
    try:
        post = await ForumService.update_post(
            db,
            thread_id=thread_id,
            post_id=post_id,
            author_id=uuid.UUID(current_user["user_id"]),
            content=payload.content,
            is_admin=is_admin,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _to_post_item(post)


@router.delete(
    "/threads/{thread_id}/posts/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_post(
    thread_id: int,
    post_id: int,
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a reply by its author or admin."""
    is_admin = current_user.get("role") == "admin"
    try:
        await ForumService.delete_post(
            db,
            thread_id=thread_id,
            post_id=post_id,
            author_id=uuid.UUID(current_user["user_id"]),
            is_admin=is_admin,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/threads/{thread_id}/posts/{post_id}/upvote",
    status_code=status.HTTP_200_OK,
)
async def upvote_post(
    thread_id: int,
    post_id: int,
    _user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, int]:
    """Upvote / like a helpful post or answer."""
    try:
        upvotes = await ForumService.upvote_post(db, thread_id=thread_id, post_id=post_id)
        return {"upvotes": upvotes}
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc