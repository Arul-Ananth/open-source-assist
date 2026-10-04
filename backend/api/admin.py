"""Administrator-only user, event, and forum moderation routes."""

import uuid
from datetime import date as DateClass
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_admin
from backend.core.database import get_db
from backend.models.event import Event
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


def _to_admin_user(user: User) -> AdminUserItem:
    return AdminUserItem(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        account_status=user.account_status,
        created_at=user.created_at,
    )


def _event_item(event: Event) -> EventItem:
    mode_val = "Online" if (event.mode or "").strip().lower() in ("online", "virtual") else "Offline"
    raw_date = getattr(event, "event_date", None) or getattr(event, "date", None)
    if isinstance(raw_date, str):
        try:
            date_val = DateClass.fromisoformat(raw_date)
        except ValueError:
            date_val = DateClass.today()
    elif raw_date is not None:
        date_val = raw_date
    else:
        date_val = DateClass.today()

    time_val = getattr(event, "event_time", None) or getattr(event, "time", None)
    time_str = time_val.strftime("%H:%M") if hasattr(time_val, "strftime") else str(time_val or "10:00")[:5]
    name_val = getattr(event, "name", None) or getattr(event, "description", None) or "Community Event"
    organizer_val = getattr(event, "organizer", None) or getattr(event, "company_organization", None) or "Community"
    type_val = getattr(event, "type", None) or getattr(event, "event_type", None) or "Meetup"
    app_url = getattr(event, "application_url", None) or ""

    return EventItem(
        id=event.id,
        name=name_val,
        type=type_val,
        date=date_val,
        time=time_str,
        mode=mode_val,
        location=event.location or "",
        organizer=organizer_val,
        application_url=app_url,
    )


async def _admin_thread_item(
    db: AsyncSession, thread_id: int, banned_ids: set[uuid.UUID]
) -> AdminForumThreadItem | None:
    thread = await ForumService.get_thread(db, thread_id)
    if thread is None:
        return None
    author = await db.scalar(select(User).where(User.id == thread.author_id))
    author_id_str = str(author.id) if author else str(thread.author_id)
    author_username = author.username if author else "[deleted]"
    author_email = author.email if author else "deleted@user"
    author_banned = (author.id in banned_ids) if author else False

    replies: list[AdminForumPostItem] = []
    for post in await ForumService.load_posts(db, thread.id):
        post_author = await db.scalar(select(User).where(User.id == post.author_id))
        replies.append(
            AdminForumPostItem(
                id=post.id,
                author_id=str(post_author.id) if post_author else str(post.author_id),
                author_username=post_author.username if post_author else "[deleted]",
                author_email=post_author.email if post_author else "deleted@user",
                content=post.content,
                created_at=post.created_at,
                banned=(post_author.id in banned_ids) if post_author else False,
            )
        )
    return AdminForumThreadItem(
        id=thread.id,
        title=thread.title,
        author_id=author_id_str,
        author_username=author_username,
        author_email=author_email,
        created_at=thread.created_at,
        replies=replies,
        banned=author_banned,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> AdminUserListResponse:
    users, total = await AdminService.list_users(db, search, limit, offset)
    return AdminUserListResponse(
        users=[_to_admin_user(user) for user in users], total=total, limit=limit, offset=offset
    )


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def update_user(
    user_id: uuid.UUID,
    payload: UpdateUserAdminRequest,
    admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminUserItem:
    if str(user_id) == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot modify your own account")
    if payload.role is None and payload.account_status is None:
        raise HTTPException(status_code=400, detail="Provide at least one field to update")
    user = await AdminService.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        updated = await AdminService.update_user(db, user, payload.role, payload.account_status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_admin_user(updated)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    if str(user_id) == admin["user_id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
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
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EventListResponse:
    events = await EventService.list_events(db, limit=limit, offset=offset)
    return EventListResponse(events=[_event_item(e) for e in events])


@router.post("/events", response_model=EventItem, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreateRequest,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventItem:
    try:
        event = await EventService.create_event(db, payload)
        return _event_item(event)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/events/{event_id}", response_model=EventItem)
@router.put("/events/{event_id}", response_model=EventItem)
async def update_event(
    event_id: int,
    payload: EventCreateRequest,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventItem:
    try:
        event = await EventService.update_event(db, event_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return _event_item(event)


@router.delete("/events/ended", response_model=DeleteEndedEventsResponse)
async def delete_ended_events(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeleteEndedEventsResponse:
    return DeleteEndedEventsResponse(deleted=await EventService.delete_ended(db))


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    deleted = await EventService.delete_event(db, event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/forum/threads", response_model=AdminForumThreadListResponse)
async def list_forum_threads(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AdminForumThreadListResponse:
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
    await ForumService.unban_user(db, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/forum/bans", response_model=ForumBanListResponse)
async def list_forum_bans(
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ForumBanListResponse:
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
