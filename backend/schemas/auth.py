"""Pydantic schemas for authentication and password recovery workflows."""

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


UserRole = Literal["user", "admin"]
AccountStatus = Literal["active", "suspended", "banned"]


class SignupRequest(BaseModel):
    """Payload to initiate user registration and dispatch verification OTP."""

    email: EmailStr = Field(description="Account email address.")
    username: str | None = Field(
        default=None, min_length=3, max_length=50, description="Account display username."
    )
    password: str = Field(min_length=8, max_length=128, description="Account password.")
    confirm_password: str = Field(
        min_length=8, max_length=128, description="Password confirmation."
    )

    @field_validator("username", mode="before")
    @classmethod
    def sanitize_username(cls, v: Any) -> str | None:
        if v is None:
            return None
        if isinstance(v, str):
            v_clean = v.strip()
            return v_clean if v_clean else None
        return v

    @model_validator(mode="after")
    def verify_passwords_match(self) -> "SignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class VerifySignupOTPRequest(BaseModel):
    """Payload to verify registration OTP and finalize account creation."""

    email: EmailStr = Field(description="Account email address.")
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="Six-digit registration verification code.",
    )


class LoginRequest(BaseModel):
    """Payload for user login."""

    email: str = Field(min_length=1, max_length=255, description="Account email address or username.")
    password: str = Field(min_length=1, max_length=128, description="Account password.")


class ForgotPasswordRequest(BaseModel):
    """Payload to request password reset OTP."""

    email: EmailStr = Field(description="Account email address.")


class ResetPasswordRequest(BaseModel):
    """Payload to verify reset OTP and replace account password."""

    email: EmailStr = Field(description="Account email address.")
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
        description="Six-digit reset code.",
    )
    new_password: str = Field(
        min_length=8, max_length=128, description="Replacement account password."
    )


class TokenResponse(BaseModel):
    """Response payload containing JWT access token."""

    access_token: str = Field(description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Bearer authentication scheme.")


class AuthResponse(BaseModel):
    """Response payload returned upon registration verification and login."""

    access_token: str = Field(description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Bearer authentication scheme.")
    message: str = Field(description="Status confirmation message.")


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str = Field(description="Operation result message.")


class UserProfileResponse(BaseModel):
    """User profile data returned by /me endpoint."""

    id: str = Field(description="User unique identifier UUID.")
    email: EmailStr = Field(description="User account email address.")
    username: str | None = Field(default=None, description="Account display username.")
    github_username: str | None = Field(default=None, description="Linked GitHub account username.")
    skill_level: str | None = Field(default=None, description="Assessed technical skill level.")
    user_context: str | None = Field(default=None, description="Synthesized developer context.")
    role: UserRole = Field(default="user", description="Account authorization role.")
    account_status: AccountStatus = Field(default="active", description="Account status.")


class GitHubCodeRequest(BaseModel):
    """Payload to exchange GitHub authorization code for JWT token."""

    code: str = Field(description="GitHub OAuth authorization code.")
    redirect_uri: str | None = Field(default=None, description="Optional custom redirect URI.")


class GitHubAuthUrlResponse(BaseModel):
    """Response payload containing GitHub OAuth authorization URL."""

    configured: bool = Field(description="Whether GitHub OAuth credentials are configured.")
    url: str | None = Field(default=None, description="GitHub OAuth authorization URL.")
    has_pat: bool = Field(default=False, description="Whether server has fallback PAT configured for dev login.")

