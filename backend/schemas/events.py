"""Typed API contracts for community events."""

from datetime import date as DateType
from typing import Literal

from pydantic import BaseModel, Field


EventMode = Literal["Online", "Offline"]


class EventCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Event name.")
    type: str = Field(min_length=1, max_length=50, description="Event category.")
    date: DateType = Field(description="Event date.")
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="Event time in HH:MM format.")
    mode: EventMode = Field(description="Whether the event is online or offline.")
    location: str = Field(default="", max_length=255, description="Venue for offline events.")
    organizer: str = Field(min_length=1, max_length=150, description="Event organizer.")


class EventItem(BaseModel):
    id: int = Field(description="Event identifier.")
    name: str = Field(description="Event name.")
    type: str = Field(description="Event category.")
    date: DateType = Field(description="Event date.")
    time: str = Field(description="Event time in HH:MM format.")
    mode: EventMode = Field(description="Whether the event is online or offline.")
    location: str = Field(description="Venue for offline events.")
    organizer: str = Field(description="Event organizer.")


class EventListResponse(BaseModel):
    events: list[EventItem] = Field(description="Published community events.")


class DeleteEndedEventsResponse(BaseModel):
    deleted: int = Field(description="Number of ended events deleted.")


# Backward compatibility aliases
EventCreate = EventCreateRequest
EventResponse = EventItem