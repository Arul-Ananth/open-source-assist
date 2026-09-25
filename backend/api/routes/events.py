"""Routes for the events CRUD endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.events import EventCreate, EventResponse
from backend.services import event_service

router = APIRouter(tags=["Events"])


@router.post(
    "/events",
    response_model=EventResponse,
    status_code=201,
    summary="Create a new event",
)
async def create_event(
    payload: EventCreate,
    session: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Create a tech event (hackathon, meetup, conference, etc.)."""
    return await event_service.create_event(session, payload)


@router.get(
    "/events",
    response_model=list[EventResponse],
    summary="List events",
)
async def list_events(
    event_type: str | None = Query(
        default=None, description="Filter by event type."
    ),
    mode: str | None = Query(
        default=None, description="Filter by mode (online, in-person, hybrid)."
    ),
    company: str | None = Query(
        default=None, description="Search by company / organisation name."
    ),
    limit: int = Query(default=50, ge=1, le=100, description="Page size."),
    offset: int = Query(default=0, ge=0, description="Page offset."),
    session: AsyncSession = Depends(get_db),
) -> list[EventResponse]:
    """List events, optionally filtered by type, mode, or company."""
    return await event_service.list_events(
        session, event_type, mode, company, limit, offset
    )


@router.get(
    "/events/{event_id}",
    response_model=EventResponse,
    summary="Get a single event",
)
async def get_event(
    event_id: int,
    session: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Retrieve a single event by ID."""
    event = await event_service.get_event(session, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put(
    "/events/{event_id}",
    response_model=EventResponse,
    summary="Update an event",
)
async def update_event(
    event_id: int,
    payload: EventCreate,
    session: AsyncSession = Depends(get_db),
) -> EventResponse:
    """Update all fields of an existing event."""
    event = await event_service.update_event(session, event_id, payload)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.delete(
    "/events/{event_id}",
    status_code=204,
    summary="Delete an event",
)
async def delete_event(
    event_id: int,
    session: AsyncSession = Depends(get_db),
) -> None:
    """Delete an event by ID."""
    deleted = await event_service.delete_event(session, event_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")
