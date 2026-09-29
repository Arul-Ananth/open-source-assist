"""Schema package exports."""

from backend.schemas.admin import (
    AdminForumPostItem,
    AdminForumThreadItem,
    AdminForumThreadListResponse,
    AdminUserItem,
    AdminUserListResponse,
    ForumBanItem,
    ForumBanListResponse,
    UpdateUserAdminRequest,
)
from backend.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserProfileResponse,
    VerifySignupOTPRequest,
)
from backend.schemas.events import EventCreateRequest, EventItem, EventListResponse
from backend.schemas.forum import (
    ForumPostCreateRequest,
    ForumPostItem,
    ForumThreadCreateRequest,
    ForumThreadItem,
    ForumThreadListResponse,
    ForumThreadSummary,
)

__all__ = [
    "AdminForumPostItem",
    "AdminForumThreadItem",
    "AdminForumThreadListResponse",
    "AdminUserItem",
    "AdminUserListResponse",
    "AuthResponse",
    "EventCreateRequest",
    "EventItem",
    "EventListResponse",
    "ForgotPasswordRequest",
    "ForumBanItem",
    "ForumBanListResponse",
    "ForumPostCreateRequest",
    "ForumPostItem",
    "ForumThreadCreateRequest",
    "ForumThreadItem",
    "ForumThreadListResponse",
    "ForumThreadSummary",
    "LoginRequest",
    "MessageResponse",
    "ResetPasswordRequest",
    "SignupRequest",
    "TokenResponse",
    "UpdateUserAdminRequest",
    "UserProfileResponse",
    "VerifySignupOTPRequest",
]
