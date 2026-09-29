"""Business logic for authentication and account lifecycle."""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.jwt import create_access_token
from backend.core.security import hash_password, verify_password
from backend.models.otp_model import OTPPurpose
from backend.models.user_model import User
from backend.services.otp_service import OTPService


class AuthService:
    """Coordinates credential verification, signup, and password recovery."""

    @staticmethod
    async def request_signup(
        db: AsyncSession,
        email: str,
        password: str,
        confirm_password: str,
        username: str | None = None,
    ) -> None:
        if password != confirm_password:
            raise ValueError("Passwords do not match")
        normalized_email = email.strip().lower()
        existing_user = await db.scalar(select(User).where(User.email == normalized_email))
        if existing_user is not None:
            raise ValueError("User with this email already exists")

        payload = {"password_hash": hash_password(password)}
        if username:
            payload["username"] = username.strip()
        await OTPService.generate_and_store_otp(
            db=db,
            email=normalized_email,
            purpose=OTPPurpose.SIGNUP_VERIFICATION,
            payload=payload,
        )

    @staticmethod
    async def verify_signup_otp(db: AsyncSession, email: str, otp: str) -> str:
        normalized_email = email.strip().lower()
        existing_user = await db.scalar(select(User).where(User.email == normalized_email))
        if existing_user is not None:
            raise ValueError("User with this email already exists")

        payload = await OTPService.verify_and_consume_otp(
            db=db,
            email=normalized_email,
            purpose=OTPPurpose.SIGNUP_VERIFICATION,
            submitted_otp=otp,
        )
        if "password_hash" not in payload:
            raise ValueError("Invalid registration data. Please sign up again.")

        user = User(
            id=uuid.uuid4(),
            email=normalized_email,
            username=payload.get("username"),
            password_hash=payload["password_hash"],
            role="user",
            account_status="active",
            is_active=True,
        )
        db.add(user)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError("User with this email already exists") from exc
        await db.refresh(user)
        return create_access_token(str(user.id))

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> str:
        normalized_email = email.strip().lower()
        user = await db.scalar(select(User).where(User.email == normalized_email))
        if user is None or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        if not user.is_active:
            raise ValueError("Account is deactivated")
        return create_access_token(str(user.id))

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> None:
        normalized_email = email.strip().lower()
        user = await db.scalar(select(User).where(User.email == normalized_email))
        if user is None:
            return
        await OTPService.generate_and_store_otp(
            db=db,
            email=normalized_email,
            purpose=OTPPurpose.RESET_PASSWORD,
        )

    @staticmethod
    async def reset_password(db: AsyncSession, email: str, otp: str, new_password: str) -> None:
        normalized_email = email.strip().lower()
        user = await db.scalar(select(User).where(User.email == normalized_email))
        if user is None:
            raise ValueError("No account found with this email address.")
        await OTPService.verify_and_consume_otp(
            db=db,
            email=normalized_email,
            purpose=OTPPurpose.RESET_PASSWORD,
            submitted_otp=otp,
        )
        user.password_hash = hash_password(new_password)
        await db.commit()
