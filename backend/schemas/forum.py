"""Pydantic schemas for forum endpoints."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ForumPostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class ForumThreadCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=1, max_length=5000)


class ForumPostItem(BaseModel):
    id: int
    author_id: str
    author_username: str | None = None
    author_email: EmailStr
    content: str
    created_at: datetime


class ForumThreadSummary(BaseModel):
    id: int
    title: str
    author_id: str
    author_username: str | None = None
    author_email: EmailStr
    created_at: datetime
    reply_count: int


class ForumThreadItem(BaseModel):
    id: int
    title: str
    author_id: str
    author_username: str | None = None
    author_email: EmailStr
    created_at: datetime
    replies: list[ForumPostItem]


class ForumThreadListResponse(BaseModel):
    threads: list[ForumThreadSummary]
