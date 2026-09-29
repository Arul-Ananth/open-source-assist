"""Business logic for public event reads and administrator event management."""

from datetime import datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.event_model import Event
from backend.schemas.events import EventCreateRequest

IST = ZoneInfo("Asia/Kolkata")


class EventService:
    """Coordinate persisted event operations."""

    @staticmethod
    def starts_at(event: Event) -> datetime:
        return datetime.combine(event.date, event.time, tzinfo=IST)

    @staticmethod
    def is_ended(event: Event, now: datetime | None = None) -> bool:
        return EventService.starts_at(event) < (now or datetime.now(IST))

    @staticmethod
    async def list_events(db: AsyncSession) -> list[Event]:
        result = await db.scalars(
            select(Event).order_by(Event.date.asc(), Event.time.asc(), Event.id.asc())
        )
        return list(result.all())

    @staticmethod
    async def get_event(db: AsyncSession, event_id: int) -> Event | None:
        return await db.scalar(select(Event).where(Event.id == event_id))

    @staticmethod
    def _event_values(data: EventCreateRequest) -> dict[str, object]:
        if data.mode == "Online":
            location = ""
        else:
            location = data.location.strip()
            if not location:
                raise ValueError("Offline events require a location")
        return {
            "name": data.name.strip(),
            "type": data.type.strip(),
            "date": data.date,
            "time": time.fromisoformat(data.time),
            "mode": data.mode,
            "location": location,
            "organizer": data.organizer.strip(),
        }

    @staticmethod
    async def create_event(db: AsyncSession, data: EventCreateRequest) -> Event:
        event = Event(**EventService._event_values(data))
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def update_event(db: AsyncSession, event: Event, data: EventCreateRequest) -> Event:
        for field, value in EventService._event_values(data).items():
            setattr(event, field, value)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def delete_event(db: AsyncSession, event: Event) -> None:
        await db.delete(event)
        await db.commit()

    @staticmethod
    async def delete_ended(db: AsyncSession) -> int:
        events = await EventService.list_events(db)
        ended_ids = [event.id for event in events if EventService.is_ended(event)]
        if not ended_ids:
            return 0
        await db.execute(delete(Event).where(Event.id.in_(ended_ids)))
        await db.commit()
        return len(ended_ids)