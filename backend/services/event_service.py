"""Business logic for public event reads and administrator event management."""

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.event import Event
from backend.schemas.events import EventCreateRequest

IST = ZoneInfo("Asia/Kolkata")


def _starts_at(ev: Event) -> datetime:
    ev_date = getattr(ev, "event_date", getattr(ev, "date", None))
    ev_time = getattr(ev, "event_time", getattr(ev, "time", None))
    if isinstance(ev_time, str):
        ev_time = time.fromisoformat(ev_time)
    return datetime.combine(ev_date, ev_time, tzinfo=IST)


def _is_ended(ev: Event, now: datetime | None = None) -> bool:
    try:
        return _starts_at(ev) < (now or datetime.now(IST))
    except Exception:
        return False


async def list_events(
    session: AsyncSession,
    event_type: str | None = None,
    mode: str | None = None,
    company: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Event]:
    stmt = select(Event).order_by(Event.event_date.asc(), Event.event_time.asc(), Event.id.asc())
    if event_type:
        stmt = stmt.where(Event.event_type.ilike(f"%{event_type}%"))
    if mode:
        stmt = stmt.where(Event.mode.ilike(f"%{mode}%"))
    if company:
        stmt = stmt.where(
            Event.company_organization.ilike(f"%{company}%") | Event.name.ilike(f"%{company}%")
        )
    stmt = stmt.offset(offset).limit(limit)
    result = await session.scalars(stmt)
    return list(result.all())


async def get_event(session: AsyncSession, event_id: int) -> Event | None:
    return await session.scalar(select(Event).where(Event.id == event_id))


def _event_dict(payload: object) -> dict[str, object]:
    name = getattr(payload, "name", "")
    organizer = getattr(payload, "organizer", getattr(payload, "company_organization", ""))
    ev_type = getattr(payload, "type", getattr(payload, "event_type", "Meetup"))
    mode_raw = getattr(payload, "mode", "Online")
    mode = "Online" if mode_raw.lower() in ("online", "virtual") else "Offline"
    location = getattr(payload, "location", "") or ""
    if mode == "Offline" and not location.strip():
        raise ValueError("Offline events require a location")
    if mode == "Online":
        location = ""

    ev_date = getattr(payload, "date", getattr(payload, "event_date", None))
    ev_time = getattr(payload, "time", getattr(payload, "event_time", None))
    if isinstance(ev_time, str):
        ev_time = time.fromisoformat(ev_time)

    app_url = str(getattr(payload, "application_url", getattr(payload, "applicationUrl", "")) or "")

    return {
        "name": name.strip(),
        "company_organization": organizer.strip(),
        "event_type": ev_type.strip(),
        "description": name.strip(),
        "mode": mode,
        "location": location.strip() or None,
        "event_date": ev_date,
        "event_time": ev_time,
        "application_url": app_url,
    }


async def create_event(session: AsyncSession, payload: object) -> Event:
    values = _event_dict(payload)
    event = Event(**values)
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def update_event(session: AsyncSession, event_id: int, payload: object) -> Event | None:
    event = await get_event(session, event_id)
    if not event:
        return None
    for k, v in _event_dict(payload).items():
        setattr(event, k, v)
    await session.commit()
    await session.refresh(event)
    return event


async def delete_event(session: AsyncSession, event_id: int | Event) -> bool:
    if isinstance(event_id, Event):
        event = event_id
    else:
        event = await get_event(session, event_id)
    if not event:
        return False
    await session.delete(event)
    await session.commit()
    return True


async def delete_ended_events(session: AsyncSession) -> int:
    events = await list_events(session)
    ended_ids = [e.id for e in events if _is_ended(e)]
    if not ended_ids:
        return 0
    await session.execute(delete(Event).where(Event.id.in_(ended_ids)))
    await session.commit()
    return len(ended_ids)


class EventService:
    """Class wrapper providing static methods for existing admin routes."""

    starts_at = staticmethod(_starts_at)
    is_ended = staticmethod(_is_ended)
    list_events = staticmethod(list_events)
    get_event = staticmethod(get_event)
    create_event = staticmethod(create_event)
    update_event = staticmethod(update_event)
    delete_event = staticmethod(delete_event)
    delete_ended = staticmethod(delete_ended_events)