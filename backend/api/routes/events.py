"""Public event endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.models.event_model import Event
from backend.schemas.events import EventItem, EventListResponse
from backend.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


def _event_item(event: Event) -> EventItem:
    return EventItem(
        id=event.id,
        name=event.name,
        type=event.type,
        date=event.date,
        time=event.time.strftime("%H:%M"),
        mode=event.mode,
        location=event.location,
        organizer=event.organizer,
    )


@router.get("", response_model=EventListResponse)
async def list_events(db: AsyncSession = Depends(get_db)) -> EventListResponse:
    """List published events in chronological order."""
    return EventListResponse(events=[_event_item(event) for event in await EventService.list_events(db)])