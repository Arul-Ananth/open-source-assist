"""Administrator-only user, event, and forum moderation routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_admin
from backend.core.database import get_db
from backend.models.event_model import Event
from backend.models.user_model import User
from backend.schemas.admin import (
    AdminForumPostItem,
    AdminForumThreadItem,
    AdminForumThreadListResponse,
    AdminUserItem,
    AdminUserListResponse,
    ForumBanItem,
    ForumBanListResponse,
    UpdateUserAdminRequest,
)
from backend.schemas.events import (
    DeleteEndedEventsResponse,
    EventCreateRequest,
    EventItem,
    EventListResponse,
)
from backend.services.admin_service import AdminService
from backend.services.event_service import EventService
from backend.services.forum_service import ForumService

router = APIRouter(prefix="/admin", tags=["Administration"])


def _user_item(user: User) -> AdminUserItem:
    return AdminUserItem(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        account_status=user.account_status,
        created_at=user.created_at,
    )


def _event_item(event: Event) -> EventItem:
    mode = "Online" if (event.mode or "").strip().lower() in ("online", "virtual") else "Offline"
    return EventItem(
        id=event.id,
        name=event.name,
        type=event.type,
        date=event.date,
        time=event.time.strftime("%H:%M"),
        mode=mode,
        location=event.location or "",
        organizer=event.organizer,
    )



async def _admin_thread_item(
    db: AsyncSession, thread_id: int, banned_ids: set[uuid.UUID]
) -> AdminForumThreadItem | None:
    thread = await ForumService.get_thread(db, thread_id)
    if thread is None:
        return None
    author = await db.scalar(select(User).where(User.id == thread.author_id))
    if author is None:
        return None
    replies: list[AdminForumPostItem] = []
    for post in await ForumService.load_posts(db, thread.id):
        post_author = await db.scalar(select(User).where(User.id == post.author_id))
        if post_author is not None:
            replies.append(
                AdminForumPostItem(
                    id=post.id,
                    author_id=str(post_author.id),
                    author_username=post_author.username,
                    author_email=post_author.email,
                    content=post.content,
                    created_at=post.created_at,
                    banned=post_author.id in banned_ids,
                )
            )
    return AdminForumThreadItem(
        id=thread.id,
        title=thread.title,
        author_id=str(author.id),
        author_username=author.username,
        author_email=author.email,
        created_at=thread.created_at,
        replies=replies,
        banned=author.id in banned_ids,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminUserListResponse:
    """List and search accounts for administrator review."""
    users, total = await AdminService.list_users(db, search, limit, offset)
    return AdminUserListResponse(
        users=[_user_item(user) for user in users], total=total, limit=limit, offset=offset
    )


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def update_user(
    user_id: uuid.UUID,
    payload: UpdateUserAdminRequest,
    admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserItem:
    """Change a user's role or account moderation status."""
    if str(user_id) == admin["user_id"]:
        raise HTTPException(status_code=400, detail="An administrator cannot modify their own account.")
    if payload.role is None and payload.account_status is None:
        raise HTTPException(status_code=400, detail="Provide at least one field to update.")
    user = await AdminService.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        updated = await AdminService.update_user(db, user, payload.role, payload.account_status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _user_item(updated)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a user account, protecting the current and last administrator."""
    if str(user_id) == admin["user_id"]:
        raise HTTPException(status_code=400, detail="An administrator cannot delete their own account.")
    user = await AdminService.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        await AdminService.delete_user(db, user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/events", response_model=EventListResponse)
async def admin_events(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventListResponse:
    """List persisted events for administrator management."""
    return EventListResponse(events=[_event_item(event) for event in await EventService.list_events(db)])


@router.post("/events", response_model=EventItem, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreateRequest,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventItem:
    """Create a community event."""
    try:
        return _event_item(await EventService.create_event(db, payload))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/events/{event_id}", response_model=EventItem)
async def update_event(
    event_id: int,
    payload: EventCreateRequest,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventItem:
    """Replace an event's editable fields."""
    event = await EventService.get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        return _event_item(await EventService.update_event(db, event, payload))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/events/ended", response_model=DeleteEndedEventsResponse)
async def delete_ended_events(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeleteEndedEventsResponse:
    """Delete all events that have already ended in India Standard Time."""
    return DeleteEndedEventsResponse(deleted=await EventService.delete_ended(db))


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a single event."""
    event = await EventService.get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    await EventService.delete_event(db, event)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/forum/threads", response_model=AdminForumThreadListResponse)
async def list_forum_threads(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminForumThreadListResponse:
    """List forum threads and replies with forum-ban indicators."""
    bans = await ForumService.list_bans(db)
    banned_ids = {user.id for _, user in bans}
    threads = await ForumService.list_threads(db)
    items = [
        item
        for thread in threads
        if (item := await _admin_thread_item(db, thread.id, banned_ids)) is not None
    ]
    return AdminForumThreadListResponse(threads=items)


@router.delete("/forum/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_forum_thread(
    thread_id: int,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Delete a forum thread and its replies."""
    try:
        await ForumService.delete_thread(db, thread_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/forum/bans/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def ban_forum_user(
    user_id: uuid.UUID,
    admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Ban a non-admin account from creating forum posts."""
    try:
        await ForumService.ban_user(db, user_id, uuid.UUID(admin["user_id"]))
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/forum/bans/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unban_forum_user(
    user_id: uuid.UUID,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Remove a forum-only ban from a user."""
    await ForumService.unban_user(db, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/forum/bans", response_model=ForumBanListResponse)
async def list_forum_bans(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumBanListResponse:
    """List active forum-only bans."""
    return ForumBanListResponse(
        bans=[
            ForumBanItem(
                user_id=str(user.id),
                username=user.username,
                email=user.email,
                created_at=ban.created_at,
            )
            for ban, user in await ForumService.list_bans(db)
        ]
    )