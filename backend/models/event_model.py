"""Event database model."""

from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, Integer, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    time: Mapped[time] = mapped_column(Time, nullable=False)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default="")
    organizer: Mapped[str] = mapped_column(String(150), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
