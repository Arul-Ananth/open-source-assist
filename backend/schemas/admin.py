"""Pydantic schemas for administrator endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


AccountStatus = Literal["active", "suspended", "banned"]
UserRole = Literal["user", "admin"]


class AdminUserItem(BaseModel):
    id: str
    email: EmailStr
    username: str | None = None
    role: UserRole
    account_status: AccountStatus
    created_at: datetime


class AdminUserListResponse(BaseModel):
    users: list[AdminUserItem]
    total: int
    limit: int
    offset: int


class UpdateUserAdminRequest(BaseModel):
    role: UserRole | None = None
    account_status: AccountStatus | None = None


class AdminForumPostItem(BaseModel):
    id: int
    author_id: str
    author_username: str | None = None
    author_email: EmailStr
    content: str
    created_at: datetime
    banned: bool = False


class AdminForumThreadItem(BaseModel):
    id: int
    title: str
    author_id: str
    author_username: str | None = None
    author_email: EmailStr
    created_at: datetime
    replies: list[AdminForumPostItem] = Field(default_factory=list)
    banned: bool = False


class AdminForumThreadListResponse(BaseModel):
    threads: list[AdminForumThreadItem]


class ForumBanItem(BaseModel):
    user_id: str
    username: str | None = None
    email: EmailStr
    created_at: datetime


class ForumBanListResponse(BaseModel):
    bans: list[ForumBanItem]
