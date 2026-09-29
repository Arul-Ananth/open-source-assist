"""Pydantic schemas for events."""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


EventMode = Literal["Online", "Offline"]


class EventCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    type: str = Field(min_length=1, max_length=50)
    date: date
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    mode: EventMode
    location: str = Field(default="", max_length=255)
    organizer: str = Field(min_length=1, max_length=150)


class EventItem(BaseModel):
    id: int
    name: str
    type: str
    date: date
    time: str
    mode: EventMode
    location: str
    organizer: str


class EventListResponse(BaseModel):
    events: list[EventItem]
