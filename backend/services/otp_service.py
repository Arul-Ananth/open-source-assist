"""Business logic for password-reset OTP issuance and redemption."""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.security import hash_otp, hash_password, verify_otp
from backend.models.otp_model import OTP, OTPPurpose
from backend.models.user_model import User
from backend.scripts.mailer import send_password_reset_otp


class OTPService:
    """Issue short-lived, single-use password-reset codes."""

    @staticmethod
    async def request_reset(db: AsyncSession, email: str) -> None:
        normalized_email = email.strip().lower()
        if await db.scalar(select(User).where(User.email == normalized_email)) is None:
            return

        otp = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        db.add(
            OTP(
                email=normalized_email,
                otp=hash_otp(otp),
                expires_at=expires_at,
                purpose=OTPPurpose.RESET_PASSWORD,
            )
        )
        await db.commit()
        await send_password_reset_otp(normalized_email, otp)

    @staticmethod
    async def reset_password(
        db: AsyncSession, email: str, otp: str, new_password: str
    ) -> None:
        normalized_email = email.strip().lower()
        user = await db.scalar(select(User).where(User.email == normalized_email))
        record = await db.scalar(
            select(OTP)
            .where(
                OTP.email == normalized_email,
                OTP.purpose == OTPPurpose.RESET_PASSWORD,
                OTP.is_used.is_(False),
            )
            .order_by(OTP.created_at.desc(), OTP.id.desc())
        )
        now = datetime.now(timezone.utc)
        if user is None or record is None or OTPService._expired(record.expires_at, now):
            raise ValueError("Invalid or expired OTP")
        if not verify_otp(otp, record.otp):
            raise ValueError("Invalid or expired OTP")

        user.password_hash = hash_password(new_password)
        record.is_used = True
        await db.commit()

    @staticmethod
    def _expired(expires_at: datetime, now: datetime) -> bool:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        return expires_at <= now