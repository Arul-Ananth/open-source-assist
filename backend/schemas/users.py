"""Pydantic schemas for user registration, profile, and context management."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr = Field(description="User email address.")
    username: str | None = Field(
        default=None, min_length=3, max_length=50, description="Display name."
    )
    password: str = Field(
        min_length=8, max_length=128, description="Plain-text password (hashed server-side)."
    )


class UserLogin(BaseModel):
    email: EmailStr = Field(description="Registered email.")
    password: str = Field(description="Plain-text password.")


class UserUpdate(BaseModel):
    username: str | None = Field(
        default=None, min_length=3, max_length=50, description="New display name."
    )
    context: dict[str, Any] | None = Field(
        default=None,
        description="Agent context blob (skill_level, background, interests, etc.).",
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str | None
    is_active: bool
    context: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class UserLoginResponse(BaseModel):
    user: UserResponse
    message: str = "Login successful"
