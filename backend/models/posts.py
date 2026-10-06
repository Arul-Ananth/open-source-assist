import uuid
from sqlalchemy import Column, String, TIMESTAMP, func, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB, TSVECTOR
from backend.core.database import Base
from sqlalchemy.orm import relationship

class Post(Base):
    __tablename__ = "posts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    community_id = Column(UUID(as_uuid=True), ForeignKey("communities.id", ondelete="SET NULL"), nullable=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    slug = Column(String, nullable=True, index=True)
    content = Column(JSONB, nullable=False)
    excerpt = Column(String)
    status = Column(String, nullable=False, server_default="published")
    published_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    # optional: tsv = Column(TSVECTOR)  # configure via migration/trigger

    # relationships (optional)
    author = relationship("User", backref="posts", foreign_keys=[author_id])