from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class PostCreate(BaseModel):
    community_id: Optional[UUID]
    title: str
    content: dict
    excerpt: Optional[str] = None

class PostOut(BaseModel):
    id: UUID
    community_id: Optional[UUID]
    author_id: Optional[UUID]
    title: str
    content: dict
    excerpt: Optional[str]
    published_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}