"""Application configuration module using Pydantic Settings.

Supports environment variables and .env files for local, dockerized,
and cloud deployment configurations.
"""

from pathlib import Path
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Core application settings."""

    model_config = SettingsConfigDict(
        env_file=(str(_ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: Literal["development", "testing", "production"] = Field(
        default="development",
        description="Deployment environment name.",
    )
    API_V1_PREFIX: str = Field(
        default="/api/v1",
        description="URL prefix for version 1 API routes.",
    )

    # Qdrant Database Configuration (Server Only: Local Docker, Self-Hosted, or Qdrant Cloud)
    QDRANT_URL: str = Field(
        default="http://localhost:6333",
        description="Required Qdrant Server URL (e.g., http://localhost:6333 or Qdrant Cloud URL).",
    )
    QDRANT_API_KEY: str | None = Field(
        default=None,
        description="API Key for Qdrant Cloud or protected server instances.",
    )

    @field_validator("QDRANT_API_KEY", mode="before")
    @classmethod
    def clean_api_key(cls, v: str | None) -> str | None:
        if v is not None and str(v).strip() == "":
            return None
        return v
    QDRANT_PREFER_GRPC: bool = Field(
        default=False,
        description="Whether to use gRPC protocol for faster binary serialization to Qdrant Server.",
    )
    QDRANT_COLLECTION_NAME: str = Field(
        default="open_source_repositories",
        description="Collection name in Qdrant for storing repository embeddings.",
    )
    QDRANT_VECTOR_SIZE: int = Field(
        default=384,
        description="Vector dimension size matching the embedding model.",
    )

    # Embedding Configuration
    EMBEDDING_MODEL_NAME: str = Field(
        default="BAAI/bge-small-en-v1.5",
        description="FastEmbed model name for generating dense embeddings.",
    )

    # Search & Scoring Hyperparameters
    DEFAULT_POPULARITY_WEIGHT: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Default weight alpha assigned to popularity during search reranking.",
    )
    CANDIDATE_SEARCH_LIMIT: int = Field(
        default=100,
        ge=10,
        le=500,
        description="Number of semantic candidates retrieved from Qdrant prior to popularity reranking.",
    )
    DEFAULT_PAGE_LIMIT: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Default number of repositories returned per page.",
    )

    # Gemini API Configuration for Learning Materials Agent
    GEMINI_API_KEY: str | None = Field(
        default=None,
        description="API key for Google Gemini API services.",
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.5-flash",
        description="Gemini LLM model identifier for AI agents.",
    )


settings = Settings()

