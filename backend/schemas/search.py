"""Pydantic schemas for the semantic repository search API."""

from pydantic import BaseModel, Field


class RepoSearchFilter(BaseModel):
    """Optional filtering criteria for repository search."""

    language: str | None = Field(
        default=None,
        description="Filter by primary programming language (e.g., 'Python', 'Rust', 'TypeScript').",
        examples=["Python"],
    )
    min_stars: int | None = Field(
        default=None,
        ge=0,
        description="Filter for repositories with at least this number of stars.",
        examples=[50],
    )
    license: str | None = Field(
        default=None,
        description="Filter by open-source license identifier (e.g., 'MIT', 'Apache-2.0').",
        examples=["MIT"],
    )
    topic: str | None = Field(
        default=None,
        description="Filter for repositories containing a specific topic tag.",
        examples=["machine-learning"],
    )


class RepoSearchRequest(BaseModel):
    """Request payload for semantic open-source repository search."""

    query: str = Field(
        default="",
        min_length=0,
        max_length=500,
        description="Natural language query describing desired repository capabilities, domain, or technologies.",
        examples=["lightweight async web framework for microservices"],
    )
    popularity_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Relative importance given to popularity (0.0 = pure semantic match, 1.0 = popularity heavily amplified).",
        examples=[0.3],
    )
    strategy: str | None = Field(
        default=None,
        description="Scoring strategy name ('linear_hybrid' or 'multiplicative_gate'). Defaults to multiplicative_gate.",
        examples=["linear_hybrid"],
    )
    filters: RepoSearchFilter | None = Field(
        default=None,
        description="Optional metadata filters applied to candidate repositories.",
    )
    limit: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum number of search results to return.",
        examples=[20],
    )
    offset: int = Field(
        default=0,
        ge=0,
        description="Offset index for pagination.",
        examples=[0],
    )


class RepoScoreBreakdown(BaseModel):
    """Breakdown of scores contributing to the final ranking of a repository."""

    semantic_score: float = Field(
        ...,
        description="Raw cosine similarity score from dense vector search (range: 0.0 to 1.0).",
        examples=[0.87],
    )
    popularity_score: float = Field(
        ...,
        description="Normalized logarithmic score derived from repository stars and forks (range: 0.0 to 1.0).",
        examples=[0.75],
    )
    final_score: float = Field(
        ...,
        description="Calculated final ranking score after applying the selected scoring strategy.",
        examples=[1.07],
    )
    strategy: str = Field(
        ...,
        description="The ranking strategy used to calculate the final score.",
        examples=["MultiplicativeGateStrategy"],
    )


class RepoItem(BaseModel):
    """Representation of an open-source repository returned in search results."""

    repo_id: int = Field(
        ...,
        description="Unique repository identifier (e.g. GitHub repository ID).",
        examples=[89229960],
    )
    full_name: str = Field(
        ...,
        description="Full repository name in owner/repo format.",
        examples=["tiangolo/fastapi"],
    )
    html_url: str = Field(
        ...,
        description="Direct URL to the repository on GitHub or hosting platform.",
        examples=["https://github.com/tiangolo/fastapi"],
    )
    description: str | None = Field(
        default=None,
        description="Brief repository description.",
        examples=["FastAPI framework, high performance, easy to learn, fast to code, ready for production"],
    )
    language: str | None = Field(
        default=None,
        description="Primary programming language.",
        examples=["Python"],
    )
    stars: int = Field(
        ...,
        ge=0,
        description="Count of repository stars/stargazers.",
        examples=[75420],
    )
    forks: int = Field(
        ...,
        ge=0,
        description="Count of repository forks.",
        examples=[6400],
    )
    open_issues: int = Field(
        ...,
        ge=0,
        description="Count of open issues and pull requests.",
        examples=[412],
    )
    license: str | None = Field(
        default=None,
        description="SPDX license identifier.",
        examples=["MIT"],
    )
    topics: list[str] = Field(
        default_factory=list,
        description="List of topic tags associated with the repository.",
        examples=[["fastapi", "asyncio", "python", "rest-api"]],
    )
    pushed_at: str | None = Field(
        default=None,
        description="ISO 8601 timestamp of the most recent code push or commit.",
        examples=["2026-09-20T14:32:00Z"],
    )
    scores: RepoScoreBreakdown = Field(
        ...,
        description="Score details including semantic, popularity, and blended final scores.",
    )


class RepoSearchResponse(BaseModel):
    """Response payload containing paginated repository search results."""

    query: str = Field(
        ...,
        description="The executed search query string.",
        examples=["lightweight async web framework for microservices"],
    )
    total: int = Field(
        ...,
        ge=0,
        description="Total number of matching candidate repositories found.",
        examples=[42],
    )
    limit: int = Field(
        ...,
        description="Number of results requested per page.",
        examples=[20],
    )
    offset: int = Field(
        ...,
        description="Pagination offset index.",
        examples=[0],
    )
    items: list[RepoItem] = Field(
        ...,
        description="List of matching repositories ordered by ranking score descending.",
    )
    strategy: str = Field(
        ...,
        description="Scoring strategy used for ranking the returned items.",
        examples=["MultiplicativeGateStrategy"],
    )
    duration_ms: float = Field(
        ...,
        description="Total execution time for search and ranking in milliseconds.",
        examples=[12.45],
    )

