"""Typed API contracts for community events."""

from datetime import date as DateType
from typing import Literal

from pydantic import BaseModel, Field, model_validator

EventMode = Literal["Online", "Offline"]


class EventCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Event name.")
    type: str = Field(min_length=1, max_length=50, description="Event category.")
    date: DateType = Field(description="Event date.")
    time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", description="Event time in HH:MM format.")
    mode: EventMode = Field(description="Whether the event is online or offline.")
    location: str = Field(default="", max_length=255, description="Venue for offline events.")
    organizer: str = Field(min_length=1, max_length=150, description="Event organizer.")
    application_url: str = Field(default="", max_length=1000, description="Registration URL.")

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: object) -> object:
        if isinstance(data, dict):
            if "applicationUrl" in data and "application_url" not in data:
                data["application_url"] = data["applicationUrl"]
            if "event_type" in data and "type" not in data:
                data["type"] = data["event_type"]
            if "company_organization" in data and "organizer" not in data:
                data["organizer"] = data["company_organization"]
            if "event_date" in data and "date" not in data:
                data["date"] = data["event_date"]
            if "event_time" in data and "time" not in data:
                data["time"] = data["event_time"]
            if "description" in data and "name" not in data:
                data["name"] = data["description"]
        return data


class EventItem(BaseModel):
    id: int = Field(description="Event identifier.")
    name: str = Field(default="Community Event", description="Event name.")
    type: str = Field(default="Meetup", description="Event category.")
    date: DateType = Field(description="Event date.")
    time: str = Field(default="10:00", description="Event time in HH:MM format.")
    mode: EventMode = Field(default="Online", description="Whether the event is online or offline.")
    location: str = Field(default="", description="Venue for offline events.")
    organizer: str = Field(default="Community", description="Event organizer.")
    application_url: str | None = Field(default="", description="Registration URL.")
    applicationUrl: str | None = Field(default="", description="Registration URL alias.")

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: object) -> object:
        if isinstance(data, dict):
            url = data.get("application_url") or data.get("applicationUrl") or ""
            data["application_url"] = url
            data["applicationUrl"] = url
        return data


class EventListResponse(BaseModel):
    events: list[EventItem] = Field(description="Published community events.")


class DeleteEndedEventsResponse(BaseModel):
    deleted: int = Field(description="Number of ended events deleted.")


# Backward compatibility aliases
EventCreate = EventCreateRequest
EventResponse = EventItem