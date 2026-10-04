"""Typed API contracts for administrator operations."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from backend.schemas.auth import AccountStatus, UserRole


class AdminUserItem(BaseModel):
    id: str = Field(description="User UUID.")
    email: EmailStr = Field(description="User account email.")
    username: str | None = Field(default=None, description="Display username.")
    role: UserRole = Field(description="Persisted authorization role.")
    account_status: AccountStatus = Field(description="Account moderation status.")
    created_at: datetime = Field(description="Account creation timestamp.")


class AdminUserListResponse(BaseModel):
    users: list[AdminUserItem] = Field(description="Matching users.")
    total: int = Field(description="Total users matching the search.")
    limit: int = Field(description="Maximum page size.")
    offset: int = Field(description="Number of matching users skipped.")


class UpdateUserAdminRequest(BaseModel):
    role: UserRole | None = Field(default=None, description="Replacement authorization role.")
    account_status: AccountStatus | None = Field(
        default=None, description="Replacement account moderation status."
    )


class AdminForumPostItem(BaseModel):
    id: int = Field(description="Post identifier.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    content: str = Field(description="Post content.")
    created_at: datetime = Field(description="Post creation timestamp.")
    banned: bool = Field(default=False, description="Whether the author is forum-banned.")


class AdminForumThreadItem(BaseModel):
    id: int = Field(description="Thread identifier.")
    title: str = Field(description="Thread title.")
    author_id: str = Field(description="Author UUID.")
    author_username: str | None = Field(default=None, description="Author display name.")
    author_email: EmailStr = Field(description="Author email.")
    created_at: datetime = Field(description="Thread creation timestamp.")
    replies: list[AdminForumPostItem] = Field(description="Opening post and replies.")
    banned: bool = Field(default=False, description="Whether the thread author is forum-banned.")


class AdminForumThreadListResponse(BaseModel):
    threads: list[AdminForumThreadItem] = Field(description="Forum threads for moderation.")


class ForumBanItem(BaseModel):
    user_id: str = Field(description="Forum-banned user UUID.")
    username: str | None = Field(default=None, description="User display name.")
    email: EmailStr = Field(description="User email.")
    created_at: datetime = Field(description="Forum ban creation timestamp.")


class ForumBanListResponse(BaseModel):
    bans: list[ForumBanItem] = Field(description="Active forum-only bans.")

