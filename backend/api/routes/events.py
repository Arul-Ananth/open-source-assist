from datetime import date as DateClass

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.models.event import Event
from backend.schemas.events import EventItem, EventListResponse
from backend.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


def _to_event_item(event: Event) -> EventItem:

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


@router.get("", response_model=EventListResponse, summary="List events")
async def list_events(
    event_type: str | None = Query(default=None, description="Filter by event type."),
    mode: str | None = Query(default=None, description="Filter by mode."),
    company: str | None = Query(default=None, description="Search by company / organisation."),
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> EventListResponse:
    events = await EventService.list_events(db, event_type, mode, company, limit, offset)
    return EventListResponse(events=[_to_event_item(e) for e in events])


@router.get("/{event_id}", response_model=EventItem, summary="Get a single event")
async def get_event(event_id: int, db: AsyncSession = Depends(get_db)) -> EventItem:
    event = await EventService.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return _to_event_item(event)
