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
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class LoginRequest(BaseModel):
    """Payload for user login."""

    email: EmailStr = Field(description="Account email address.")
    password: str = Field(min_length=1, max_length=128, description="Account password.")


class ForgotPasswordRequest(BaseModel):
    """Payload to request password reset OTP."""

    email: EmailStr = Field(description="Account email address.")


class ResetPasswordRequest(BaseModel):
    """Payload to verify reset OTP and replace account password."""

    email: EmailStr = Field(description="Account email address.")
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    """Response payload containing JWT access token."""

    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Response payload returned upon registration verification."""

    access_token: str
    token_type: str = "bearer"
    message: str


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


class UserProfileResponse(BaseModel):
    """Profile data for the authenticated user."""

    id: str
    email: EmailStr
    username: str | None = None
    role: UserRole = "user"
    account_status: AccountStatus = "active"
