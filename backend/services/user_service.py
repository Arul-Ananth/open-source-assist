"""Service layer for user CRUD operations."""

from __future__ import annotations

import uuid

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user_model import User
from backend.schemas.users import UserCreate, UserUpdate


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


async def create_user(session: AsyncSession, payload: UserCreate) -> User:
    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=_hash_password(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate(
    session: AsyncSession, email: str, password: str
) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user or not _verify_password(password, user.password_hash):
        return None
    return user


async def get_user(session: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await session.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def update_user(
    session: AsyncSession, user_id: uuid.UUID, payload: UserUpdate
) -> User | None:
    user = await get_user(session, user_id)
    if not user:
        return None
    if payload.username is not None:
        user.username = payload.username
    if payload.context is not None:
        user.context = payload.context
    await session.commit()
    await session.refresh(user)
    return user


async def deactivate_user(
    session: AsyncSession, user_id: uuid.UUID
) -> User | None:
    user = await get_user(session, user_id)
    if not user:
        return None
    user.is_active = False
    await session.commit()
    await session.refresh(user)
    return user
