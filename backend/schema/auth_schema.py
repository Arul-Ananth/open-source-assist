"""Pydantic schemas for authentication flows."""

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr = Field(description="Account email address.")
    password: str = Field(min_length=8, max_length=128, description="Account password.")
    confirm_password: str = Field(
        min_length=8, max_length=128, description="Password confirmation."
    )


class LoginRequest(BaseModel):
    email: EmailStr = Field(description="Account email address.")
    password: str = Field(min_length=1, max_length=128, description="Account password.")


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(description="Account email address.")


class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(description="Account email address.")
    otp: str = Field(
        min_length=6, max_length=6, pattern=r"^\d{6}$", description="Six-digit reset code."
    )
    new_password: str = Field(
        min_length=8, max_length=128, description="Replacement account password."
    )


class TokenResponse(BaseModel):
    access_token: str = Field(description="Signed JWT access token.")
    token_type: str = Field(default="bearer", description="Bearer authentication scheme.")


class MessageResponse(BaseModel):
    message: str = Field(description="Operation result message.")