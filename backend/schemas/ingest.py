"""Pydantic schemas defining the repository ingestion contract.

This module provides data structures for teammate modules responsible for
data sourcing, GitHub extraction, and repository batch ingestion.
"""

from pydantic import BaseModel, Field


class RepoIngestItem(BaseModel):
    """Payload model representing a single open-source repository for vector indexing."""

    repo_id: int = Field(
        ...,
        description="Unique numerical repository identifier (e.g., GitHub repository ID).",
        examples=[89229960],
    )
    full_name: str = Field(
        ...,
        description="Repository full name in 'owner/repo' format.",
        examples=["tiangolo/fastapi"],
    )
    html_url: str = Field(
        ...,
        description="HTTP URL pointing to the repository on GitHub or hosting platform.",
        examples=["https://github.com/tiangolo/fastapi"],
    )
    description: str | None = Field(
        default=None,
        description="Repository description extracted from repository metadata.",
        examples=["FastAPI framework, high performance, easy to learn, fast to code, ready for production"],
    )
    language: str | None = Field(
        default=None,
        description="Primary programming language.",
        examples=["Python"],
    )
    stars: int = Field(
        default=0,
        ge=0,
        description="Current star count of the repository.",
        examples=[75420],
    )
    forks: int = Field(
        default=0,
        ge=0,
        description="Current fork count of the repository.",
        examples=[6400],
    )
    open_issues: int = Field(
        default=0,
        ge=0,
        description="Number of open issues and PRs.",
        examples=[412],
    )
    license: str | None = Field(
        default=None,
        description="SPDX license string (e.g. 'MIT', 'Apache-2.0').",
        examples=["MIT"],
    )
    topics: list[str] = Field(
        default_factory=list,
        description="List of repository topic keywords or tags.",
        examples=[["fastapi", "asyncio", "python", "rest-api"]],
    )
    pushed_at: str | None = Field(
        default=None,
        description="ISO 8601 timestamp of the most recent push.",
        examples=["2026-09-20T14:32:00Z"],
    )
    readme_summary: str | None = Field(
        default=None,
        description="Optional synthesized summary or key excerpt from README.md to enrich semantic vector quality.",
        examples=["High-performance async web framework built on Starlette and Pydantic."],
    )


class BatchRepoIngestRequest(BaseModel):
    """Request payload for batch repository ingestion."""

    repositories: list[RepoIngestItem] = Field(
        ...,
        min_length=1,
        description="List of repository objects to be vectorized and upserted into Qdrant.",
    )


class BatchRepoIngestResponse(BaseModel):
    """Response payload returned after completing batch ingestion."""

    inserted_count: int = Field(
        ...,
        ge=0,
        description="Total number of repository points successfully indexed into Qdrant.",
        examples=[100],
    )
    collection_name: str = Field(
        ...,
        description="Name of the Qdrant collection where repositories were stored.",
        examples=["open_source_repositories"],
    )
    duration_ms: float = Field(
        ...,
        description="Total elapsed time in milliseconds for embedding generation and vector upsert.",
        examples=[320.15],
    )

