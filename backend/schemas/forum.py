"""Typed API contracts for forum threads and posts."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ForumPostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000, description="Reply content.")


class ForumThreadCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200, description="Thread title.")
    content: str = Field(min_length=1, max_length=5000, description="Opening post content.")


class ForumPostItem(BaseModel):
    id: int = Field(description="Post identifier.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    content: str = Field(description="Post content.")
    created_at: datetime = Field(description="Post creation timestamp.")


class ForumThreadSummary(BaseModel):
    id: int = Field(description="Thread identifier.")
    title: str = Field(description="Thread title.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    created_at: datetime = Field(description="Thread creation timestamp.")
    reply_count: int = Field(description="Number of replies, excluding the opening post.")


class ForumThreadItem(BaseModel):
    id: int = Field(description="Thread identifier.")
    title: str = Field(description="Thread title.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    created_at: datetime = Field(description="Thread creation timestamp.")
    replies: list[ForumPostItem] = Field(description="Opening post followed by replies.")


class ForumThreadListResponse(BaseModel):
    threads: list[ForumThreadSummary] = Field(description="Most recent forum threads.")