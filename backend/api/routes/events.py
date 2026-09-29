"""Public event routes."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.events import EventItem, EventListResponse
from backend.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=EventListResponse)
async def list_events(db: AsyncSession = Depends(get_db)) -> EventListResponse:
    events = await EventService.list_events(db)
    return EventListResponse(
        events=[
            EventItem(
                id=event.id,
                name=event.name,
                type=event.type,
                date=event.date,
                time=event.time.strftime("%H:%M"),
                mode=event.mode,
                location=event.location,
                organizer=event.organizer,
            )
            for event in events
        ]
    )
