"""Service layer for event CRUD operations."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.event import Event
from backend.schemas.events import EventCreate


async def create_event(session: AsyncSession, payload: EventCreate) -> Event:
    event = Event(
        company_organization=payload.company_organization,
        event_type=payload.event_type,
        description=payload.description,
        mode=payload.mode,
        location=payload.location,
        event_date=payload.event_date,
        event_time=payload.event_time,
        application_url=str(payload.application_url),
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)
    return event


async def list_events(
    session: AsyncSession,
    event_type: str | None = None,
    mode: str | None = None,
    company: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    stmt = select(Event).order_by(Event.event_date.desc())
    if event_type:
        stmt = stmt.where(Event.event_type == event_type)
    if mode:
        stmt = stmt.where(Event.mode == mode)
    if company:
        stmt = stmt.where(Event.company_organization.ilike(f"%{company}%"))
    stmt = stmt.offset(offset).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_event(session: AsyncSession, event_id: int) -> Event | None:
    result = await session.execute(select(Event).where(Event.id == event_id))
    return result.scalar_one_or_none()


async def update_event(
    session: AsyncSession, event_id: int, payload: EventCreate
) -> Event | None:
    event = await get_event(session, event_id)
    if not event:
        return None
    event.company_organization = payload.company_organization
    event.event_type = payload.event_type
    event.description = payload.description
    event.mode = payload.mode
    event.location = payload.location
    event.event_date = payload.event_date
    event.event_time = payload.event_time
    event.application_url = str(payload.application_url)
    await session.commit()
    await session.refresh(event)
    return event


async def delete_event(session: AsyncSession, event_id: int) -> bool:
    event = await get_event(session, event_id)
    if not event:
        return False
    await session.delete(event)
    await session.commit()
    return True
