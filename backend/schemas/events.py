"""Pydantic schemas for the events CRUD endpoints."""

from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator


class EventCreate(BaseModel):
    """Request body for creating or updating an event."""

    company_organization: str = Field(
        description="Name of the organising company or community."
    )
    event_type: str = Field(
        description="Type of event, e.g. hackathon, meetup, conference."
    )
    description: str = Field(description="Event description.")
    mode: str = Field(description="Event mode: online, in-person, or hybrid.")
    location: str | None = Field(
        default=None,
        description="Physical location (required for in-person / hybrid events).",
    )
    event_date: date = Field(description="Date of the event.")
    event_time: time = Field(description="Start time of the event.")
    application_url: HttpUrl = Field(
        description="Registration or application URL."
    )

    @model_validator(mode="after")
    def location_required_for_in_person(self) -> "EventCreate":
        if (
            self.mode.lower() in ("in-person", "in_person", "hybrid")
            and not self.location
        ):
            raise ValueError(
                "location is required for in-person or hybrid events"
            )
        return self


class EventResponse(BaseModel):
    """Public representation of an event."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Internal database ID.")
    company_organization: str = Field(
        description="Organising company or community."
    )
    event_type: str = Field(description="Type of event.")
    description: str = Field(description="Event description.")
    mode: str = Field(description="Event mode.")
    location: str | None = Field(default=None, description="Physical location.")
    event_date: date = Field(description="Date of the event.")
    event_time: time = Field(description="Start time of the event.")
    application_url: str = Field(description="Registration URL.")
    created_at: datetime = Field(description="Record creation timestamp.")
