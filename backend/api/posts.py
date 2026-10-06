from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.database import get_db
from backend.schemas.post import PostCreate, PostOut
from backend.services.posts import create_post, get_post, list_posts

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post("/", response_model=PostOut)
async def create(
    payload: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    post = await create_post(db, current_user["user_id"], payload)
    return post


@router.get("/{post_id}", response_model=PostOut)
async def read(post_id: str, db: AsyncSession = Depends(get_db)):
    post = await get_post(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("/", response_model=list[PostOut])
async def list_posts_route(
    community_id: str | None = None,
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    posts = await list_posts(db, community_id, limit, offset)
    return posts