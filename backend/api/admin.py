"""Administrator-only API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_admin
from backend.core.database import get_db
from backend.schemas.admin import AdminUserItem, AdminUserListResponse, UpdateUserAdminRequest
from backend.schemas.events import EventCreate, EventResponse
from backend.services.admin_service import AdminService
from backend.services import event_service

router = APIRouter(prefix="/admin", tags=["Administration"])


def _to_admin_user(user: object) -> AdminUserItem:
    return AdminUserItem(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        account_status=user.account_status,
        created_at=user.created_at,
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
        raise HTTPException(status_code=400, detail="You cannot change your own role or account status")
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


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    payload: EventCreate,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventResponse:
    return await event_service.create_event(db, payload)


@router.patch("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: int,
    payload: EventCreate,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EventResponse:
    event = await event_service.update_event(db, event_id, payload)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: int,
    _admin: Annotated[dict, Depends(get_current_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    deleted = await event_service.delete_event(db, event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
