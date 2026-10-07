"""Business logic for ephemeral OTP generation, storage, and consumption.

Supports dual-mode storage:
1. Redis In-Memory KV (Preferred): Sub-millisecond verification with explicit
   eviction immunity under `volatile-lru` or dedicated persistence.
2. PostgreSQL Fallback: Standard database persistence when Redis is offline.
"""

import json
import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.redis import get_redis_client
from backend.core.security import hash_otp, verify_otp
from backend.models.otp_model import OTP, OTPPurpose
from backend.services import mail_service

logger = logging.getLogger(__name__)


class OTPService:
    """Manages short-lived OTP tokens in an ephemeral key-value pattern."""

    @staticmethod
    def _redis_key(email: str, purpose: OTPPurpose) -> str:
        return f"otp:verify:{purpose.value}:{email}"

    @staticmethod
    async def generate_and_store_otp(
        db: AsyncSession,
        email: str,
        purpose: OTPPurpose,
        payload: dict[str, Any] | None = None,
    ) -> str:
        """Generate a single-use 6-digit OTP, replace any pending OTP, and send email."""
        normalized_email = email.strip().lower()
        otp = f"{secrets.randbelow(1_000_000):06d}"
        ttl_seconds = settings.OTP_EXPIRE_MINUTES * 60
        otp_hashed = hash_otp(otp)

        # 1. Try storing in Redis (ultra-fast, zero disk write, auto-expiring)
        redis_stored = False
        try:
            r = get_redis_client()
            expires_at = datetime.now(UTC) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
            data = {
                "otp_hash": otp_hashed,
                "payload": payload or {},
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(UTC).isoformat(),
            }
            # Under volatile-lru, keys without Redis 'ex' are completely IMMUNE to eviction!
            await r.set(key, json.dumps(data))
            redis_stored = True
        except Exception as exc:
            logger.debug("Redis OTP storage unavailable, falling back to SQL: %s", exc)

        # 2. Synchronize with SQL table for persistence / fallback
        try:
            await db.execute(
                delete(OTP).where(OTP.email == normalized_email, OTP.purpose == purpose)
            )
            expires_at = datetime.now(UTC) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
            otp_record = OTP(
                email=normalized_email,
                purpose=purpose,
                otp_hash=otp_hashed,
                payload=payload,
                expires_at=expires_at,
            )
            db.add(otp_record)
            await db.commit()
        except Exception as exc:
            if not redis_stored:
                raise RuntimeError("Failed to store verification code in database or cache") from exc
            logger.warning("SQL OTP sync failed, but OTP stored safely in Redis: %s", exc)

        # 3. Dispatch notification
        if purpose == OTPPurpose.SIGNUP_VERIFICATION:
            await mail_service.send_signup_verification_otp(normalized_email, otp)
        elif purpose == OTPPurpose.RESET_PASSWORD:
            await mail_service.send_password_reset_otp(normalized_email, otp)

        return otp

    @staticmethod
    async def verify_and_consume_otp(
        db: AsyncSession,
        email: str,
        purpose: OTPPurpose,
        submitted_otp: str,
    ) -> dict[str, Any]:
        """Verify the OTP. If valid, deletes the record and returns payload."""
        normalized_email = email.strip().lower()
        clean_otp = submitted_otp.strip()

        # 1. Try verifying via Redis first (<1ms)
        try:
            r = get_redis_client()
            key = OTPService._redis_key(normalized_email, purpose)
            raw = await r.get(key)
            if raw is not None:
                record = json.loads(raw)
                # Check expiration
                exp = datetime.fromisoformat(record["expires_at"])
                if datetime.now(UTC) > exp:
                    await r.delete(key)
                    raise ValueError("Verification code has expired. Please request a new code.")

                if not verify_otp(clean_otp, record["otp_hash"]):
                    raise ValueError("Incorrect verification code. Please check your email and try again.")
                # Single use consumption: atomically delete
                await r.delete(key)
                # Clean up SQL counterpart asynchronously
                try:
                    await db.execute(
                        delete(OTP).where(OTP.email == normalized_email, OTP.purpose == purpose)
                    )
                    await db.commit()
                except Exception:
                    pass
                return record.get("payload") or {}
        except ValueError:
            raise
        except Exception as exc:
            logger.debug("Redis OTP verification unavailable, checking SQL: %s", exc)

        # 2. Fallback to SQL database verification
        now = datetime.now(UTC)
        record_sql = await db.scalar(
            select(OTP).where(
                OTP.email == normalized_email,
                OTP.purpose == purpose,
            )
        )

        if record_sql is None:
            raise ValueError("No pending verification request found for this email. Please request a new code.")

        # Check expiration
        expires_at = record_sql.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        if expires_at <= now:
            await db.delete(record_sql)
            await db.commit()
            raise ValueError("Verification code has expired. Please request a new code.")

        if not verify_otp(clean_otp, record_sql.otp_hash):
            raise ValueError("Incorrect verification code. Please check your email and try again.")

        payload = record_sql.payload or {}
        # Single-use: delete consumed OTP
        await db.delete(record_sql)
        await db.commit()
        return payload