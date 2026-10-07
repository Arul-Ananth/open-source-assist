"""Typed API contracts for forum threads and posts."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ForumPostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000, description="Reply content.")


class ForumPostUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000, description="Updated reply content.")


class ForumThreadCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=200, description="Thread title.")
    content: str = Field(min_length=1, max_length=5000, description="Opening post content.")
    category: str = Field(default="general", max_length=50, description="Category/tag for topic.")


class ForumThreadUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200, description="Updated thread title.")
    category: str | None = Field(default=None, max_length=50, description="Updated category.")
    is_solved: bool | None = Field(default=None, description="Mark whether discussion is resolved.")
    accepted_answer_id: int | None = Field(default=None, description="Post ID that answers the thread.")


class ForumPostItem(BaseModel):
    id: int = Field(description="Post identifier.")
    thread_id: int = Field(description="Parent thread identifier.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    author_avatar_url: str | None = Field(default=None, description="Author avatar link.")
    content: str = Field(description="Post content.")
    is_opening_post: bool = Field(default=False, description="Whether this is the opening topic.")
    upvotes: int = Field(default=0, description="Upvote reaction count.")
    created_at: datetime = Field(description="Post creation timestamp.")
    updated_at: datetime | None = Field(default=None, description="Post update timestamp.")


class ForumThreadSummary(BaseModel):
    id: int = Field(description="Thread identifier.")
    title: str = Field(description="Thread title.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    author_avatar_url: str | None = Field(default=None, description="Author avatar link.")
    category: str = Field(default="general", description="Category tag.")
    reply_count: int = Field(default=0, description="Number of replies excluding opening post.")
    views_count: int = Field(default=0, description="View count.")
    is_solved: bool = Field(default=False, description="Solution flag.")
    last_activity_at: datetime = Field(description="Timestamp of latest reply/activity.")
    created_at: datetime = Field(description="Thread creation timestamp.")


class ForumThreadItem(BaseModel):
    id: int = Field(description="Thread identifier.")
    title: str = Field(description="Thread title.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    author_avatar_url: str | None = Field(default=None, description="Author avatar link.")
    category: str = Field(default="general", description="Category tag.")
    reply_count: int = Field(default=0, description="Number of replies excluding opening post.")
    views_count: int = Field(default=0, description="View count.")
    is_solved: bool = Field(default=False, description="Solution flag.")
    accepted_answer_id: int | None = Field(default=None, description="Accepted solution post ID.")
    last_activity_at: datetime = Field(description="Timestamp of latest reply/activity.")
    created_at: datetime = Field(description="Thread creation timestamp.")
    replies: list[ForumPostItem] = Field(description="Opening post followed by replies.")


class ForumThreadListResponse(BaseModel):
    threads: list[ForumThreadSummary] = Field(description="List of forum thread summaries.")
    total: int = Field(default=0, description="Total matching threads count.")