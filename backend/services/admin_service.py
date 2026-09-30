"""Business logic for administrator user-management operations."""

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.user_model import User


class AdminService:
    """Coordinates administrator actions over user accounts."""

    @staticmethod
    async def list_users(db: AsyncSession, search: str | None, limit: int, offset: int) -> tuple[list[User], int]:
        query = select(User)
        normalized_search = (search or "").strip()
        if normalized_search:
            pattern = f"%{normalized_search}%"
            query = query.where(or_(User.email.ilike(pattern), User.username.ilike(pattern)))
        total = int(await db.scalar(select(func.count()).select_from(query.subquery())) or 0)
        result = await db.scalars(query.order_by(User.created_at.desc()).offset(offset).limit(limit))
        return list(result.all()), total

    @staticmethod
    async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
        return await db.scalar(select(User).where(User.id == user_id))

    @staticmethod
    async def active_admin_count(db: AsyncSession) -> int:
        return int(
            await db.scalar(
                select(func.count()).select_from(User).where(
                    User.role == "admin", User.account_status == "active", User.is_active.is_(True)
                )
            )
            or 0
        )

    @staticmethod
    async def update_user(db: AsyncSession, user: User, role: str | None, account_status: str | None) -> User:
        removing_admin_access = user.role == "admin" and (
            (role is not None and role != "admin")
            or (account_status is not None and account_status != "active")
        )
        if removing_admin_access and await AdminService.active_admin_count(db) <= 1:
            raise ValueError("The last active administrator cannot be demoted or disabled")

        if role is not None:
            user.role = role
        if account_status is not None:
            user.account_status = account_status
            user.is_active = account_status == "active"
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def delete_user(db: AsyncSession, user: User) -> None:
        if user.role == "admin" and user.account_status == "active" and user.is_active:
            if await AdminService.active_admin_count(db) <= 1:
                raise ValueError("The last active administrator cannot be deleted")
        await db.delete(user)
        await db.commit()
