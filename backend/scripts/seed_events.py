"""Seed mock community events into the PostgreSQL database."""

import asyncio
from datetime import date, time

from sqlalchemy import select

from backend.core.database import SessionLocal
from backend.models.event_model import Event

MOCK_EVENTS = [
    {
        "name": "Open Source Sprint 2026",
        "type": "Hackathon",
        "date": date(2026, 10, 12),
        "time": time(10, 0),
        "mode": "Online",
        "location": "",
        "organizer": "Open Source India",
    },
    {
        "name": "Community Maintainers Meetup",
        "type": "Meetup",
        "date": date(2026, 11, 4),
        "time": time(18, 30),
        "mode": "Offline",
        "location": "Bengaluru Tech Hub, Karnataka",
        "organizer": "FOSS United",
    },
    {
        "name": "Contributing to Your First Open Source Project",
        "type": "Workshop",
        "date": date(2026, 11, 18),
        "time": time(15, 0),
        "mode": "Online",
        "location": "",
        "organizer": "Code for Everyone",
    },
    {
        "name": "Global Open Source Summit 2026",
        "type": "Conference",
        "date": date(2026, 12, 5),
        "time": time(9, 30),
        "mode": "Offline",
        "location": "Convention Center, Hyderabad",
        "organizer": "Linux Foundation India",
    },
    {
        "name": "AI & Open Source Systems Webinar",
        "type": "Webinar",
        "date": date(2026, 12, 19),
        "time": time(16, 0),
        "mode": "Online",
        "location": "",
        "organizer": "Dev Community",
    },
]


async def seed():
    async with SessionLocal() as session:
        for item in MOCK_EVENTS:
            existing = await session.scalar(
                select(Event).where(Event.name == item["name"])
            )
            if not existing:
                event = Event(**item)
                session.add(event)
                print(f"Added event: {item['name']}")
            else:
                print(f"Event already exists: {item['name']}")
        await session.commit()
    print("Event seeding complete.")


if __name__ == "__main__":
    asyncio.run(seed())
