"""Pydantic schemas for OTP request / verify endpoints."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field

from backend.models.otp_model import OTPPurpose


class OTPRequest(BaseModel):
    email: EmailStr = Field(description="Email to send the OTP to.")
    purpose: OTPPurpose = Field(description="Why the OTP is being issued.")


class OTPVerify(BaseModel):
    email: EmailStr = Field(description="Email the OTP was sent to.")
    purpose: OTPPurpose = Field(description="Purpose that was used when requesting.")
    otp: str = Field(
        min_length=6, max_length=6, description="6-digit OTP code."
    )


class OTPResponse(BaseModel):
    message: str
    email: str
    purpose: OTPPurpose
