"""Routes for user registration, login, profile, and context management."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database import get_db
from backend.schemas.users import (
    UserCreate,
    UserLogin,
    UserLoginResponse,
    UserResponse,
    UserUpdate,
)
from backend.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
    summary="Register a new user",
)
async def register(
    payload: UserCreate,
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    existing = await user_service.get_user_by_email(session, payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = await user_service.create_user(session, payload)
    return UserResponse.model_validate(user)


@router.post(
    "/login",
    response_model=UserLoginResponse,
    summary="Authenticate with email and password",
)
async def login(
    payload: UserLogin,
    session: AsyncSession = Depends(get_db),
) -> UserLoginResponse:
    user = await user_service.authenticate(session, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")
    return UserLoginResponse(user=UserResponse.model_validate(user))


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get user profile",
)
async def get_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await user_service.get_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user profile or agent context",
)
async def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_db),
) -> UserResponse:
    user = await user_service.update_user(session, user_id, payload)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=204,
    summary="Deactivate a user account",
)
async def deactivate_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db),
) -> None:
    user = await user_service.deactivate_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
