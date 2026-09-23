"""Password-reset OTP database model."""

from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.database import Base


class OTPPurpose(str, Enum):
    RESET_PASSWORD = "RESET_PASSWORD"


class OTP(Base):
    __tablename__ = "otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    # The column contains an HMAC digest, never the six-digit code itself.
    otp: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    purpose: Mapped[OTPPurpose] = mapped_column(
        SqlEnum(OTPPurpose), default=OTPPurpose.RESET_PASSWORD, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )