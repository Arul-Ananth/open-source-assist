"""Pydantic schemas for GitHub sync, projects, and contributors."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectResponse(BaseModel):
    """Public representation of a synced GitHub repository."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(description="Internal database ID.")
    full_name: str = Field(description="GitHub full name, e.g. 'owner/repo'.")
    description: str | None = Field(
        default=None, description="Repository description."
    )
    html_url: str = Field(description="GitHub URL for the repository.")
    language: str | None = Field(
        default=None, description="Primary programming language."
    )
    topics: list[str] | None = Field(
        default=None, description="GitHub topic tags."
    )
    stars: int = Field(description="Star count.")
    forks: int = Field(description="Fork count.")
    open_issues: int = Field(description="Open issue count.")
    beginner_friendly: bool = Field(
        description="Whether tagged with beginner-friendly topics."
    )
    difficulty: str = Field(
        description="Classified difficulty: student, beginner, intermediate, advanced."
    )
    last_synced_at: datetime = Field(
        description="Last time this project was synced from GitHub."
    )


class ContributorResponse(BaseModel):
    """Public representation of a GitHub contributor."""

    model_config = ConfigDict(from_attributes=True)

    login: str = Field(description="GitHub username.")
    avatar_url: str | None = Field(default=None, description="GitHub avatar URL.")
    profile_url: str = Field(description="GitHub profile URL.")
    contributions: int = Field(
        description="Number of contributions to the project."
    )
    rank: int = Field(description="Contributor rank by contributions.")
    name: str | None = Field(default=None, description="Display name.")
    email: str | None = Field(default=None, description="Public email.")
    blog: str | None = Field(default=None, description="Blog or website URL.")
    twitter_username: str | None = Field(
        default=None, description="Twitter / X handle."
    )
    location: str | None = Field(default=None, description="Self-reported location.")
    bio: str | None = Field(default=None, description="GitHub bio.")
    company: str | None = Field(
        default=None, description="Company or organisation."
    )


class SyncResponse(BaseModel):
    """Response after a full GitHub sync."""

    projects: int = Field(description="Number of projects synced.")
    contributors: int = Field(description="Number of contributors synced.")


class ContributorSyncResponse(BaseModel):
    """Response after a contributor-only refresh."""

    contributors: int = Field(description="Number of contributors synced.")
