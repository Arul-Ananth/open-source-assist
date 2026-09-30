"""Backward-compatibility shim re-exporting Event from event_model."""

from backend.models.event_model import Event

__all__ = ["Event"]
