"""Business logic for signup and login."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.jwt import create_access_token
from backend.core.security import hash_password, verify_password
from backend.models.user_model import User


class AuthService:
    """Coordinate user persistence and credential operations."""

    @staticmethod
    async def signup(
        db: AsyncSession, email: str, password: str, confirm_password: str
    ) -> User:
        if password != confirm_password:
            raise ValueError("Passwords do not match")

        normalized_email = email.strip().lower()
        if await db.scalar(select(User).where(User.email == normalized_email)):
            raise ValueError("User with this email already exists")

        user = User(email=normalized_email, password_hash=hash_password(password))
        db.add(user)
        try:
            await db.commit()
        except IntegrityError as exc:
            await db.rollback()
            raise ValueError("User with this email already exists") from exc
        await db.refresh(user)
        return user

    @staticmethod
    async def login(db: AsyncSession, email: str, password: str) -> str:
        user = await db.scalar(select(User).where(User.email == email.strip().lower()))
        if user is None or not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")
        return create_access_token(str(user.id))