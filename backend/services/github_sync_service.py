"""Async pipeline that syncs GitHub repositories and contributors into PostgreSQL."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.contributor import Contributor
from backend.models.project import Project
from backend.services.github_client import GitHubAPIError, GitHubClient

BEGINNER_KEYWORDS: set[str] = {
    "good-first-issue",
    "beginner",
    "beginner-friendly",
    "hacktoberfest",
    "first-timers-only",
}


def _classify_difficulty(repo: dict[str, Any]) -> tuple[str, bool]:
    topics = {t.lower() for t in (repo.get("topics") or [])}
    beginner_friendly = bool(topics & BEGINNER_KEYWORDS)
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)
    if beginner_friendly and stars < 1000:
        return "student", True
    if beginner_friendly:
        return "beginner", True
    if stars > 50_000 or forks > 10_000:
        return "advanced", False
    return "intermediate", False


async def _upsert_contributor(
    session: AsyncSession,
    project_id: int,
    contrib: dict[str, Any],
    user_details: dict[str, Any],
    rank: int,
) -> None:
    now = datetime.now(timezone.utc)
    fields = {
        "login": contrib["login"],
        "avatar_url": contrib.get("avatar_url"),
        "profile_url": contrib["html_url"],
        "contributions": contrib.get("contributions", 0),
        "rank": rank,
        "name": user_details.get("name"),
        "email": user_details.get("email"),
        "blog": user_details.get("blog") or None,
        "twitter_username": user_details.get("twitter_username"),
        "location": user_details.get("location"),
        "bio": user_details.get("bio"),
        "company": user_details.get("company"),
        "last_synced_at": now,
    }
    result = await session.execute(
        select(Contributor).where(
            Contributor.project_id == project_id,
            Contributor.github_id == contrib["id"],
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        for key, value in fields.items():
            setattr(existing, key, value)
    else:
        session.add(
            Contributor(project_id=project_id, github_id=contrib["id"], **fields)
        )


async def _sync_project_contributors(
    session: AsyncSession,
    client: GitHubClient,
    project_id: int,
    full_name: str,
) -> int:
    try:
        contributors = await client.list_contributors(full_name)
    except GitHubAPIError:
        return 0
    if not isinstance(contributors, list):
        return 0
    count = 0
    for rank, contrib in enumerate(contributors, start=1):
        try:
            user_details = await client.get_user(contrib["login"])
        except Exception:
            user_details = {}
        await _upsert_contributor(session, project_id, contrib, user_details, rank)
        count += 1
    return count


async def sync_github(
    session: AsyncSession, client: GitHubClient
) -> dict[str, int]:
    repos = await client.search_repositories(per_page=25, max_pages=2)
    project_count = 0
    contributor_count = 0

    for repo in repos:
        difficulty, beginner_friendly = _classify_difficulty(repo)
        result = await session.execute(
            select(Project).where(Project.github_id == repo["id"])
        )
        project = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)

        if project:
            project.full_name = repo["full_name"]
            project.name = repo["name"]
            project.owner_login = repo["owner"]["login"]
            project.description = repo.get("description")
            project.html_url = repo["html_url"]
            project.language = repo.get("language")
            project.topics = repo.get("topics")
            project.stars = repo.get("stargazers_count", 0)
            project.forks = repo.get("forks_count", 0)
            project.open_issues = repo.get("open_issues_count", 0)
            project.beginner_friendly = beginner_friendly
            project.difficulty = difficulty
            project.last_synced_at = now
        else:
            project = Project(
                github_id=repo["id"],
                full_name=repo["full_name"],
                name=repo["name"],
                owner_login=repo["owner"]["login"],
                description=repo.get("description"),
                html_url=repo["html_url"],
                language=repo.get("language"),
                topics=repo.get("topics"),
                stars=repo.get("stargazers_count", 0),
                forks=repo.get("forks_count", 0),
                open_issues=repo.get("open_issues_count", 0),
                beginner_friendly=beginner_friendly,
                difficulty=difficulty,
            )
            session.add(project)

        await session.flush()
        project_count += 1
        contributor_count += await _sync_project_contributors(
            session, client, project.id, repo["full_name"]
        )

    await session.commit()
    return {"projects": project_count, "contributors": contributor_count}


async def sync_contributors(
    session: AsyncSession, client: GitHubClient
) -> int:
    result = await session.execute(select(Project))
    projects = result.scalars().all()
    count = 0
    for project in projects:
        count += await _sync_project_contributors(
            session, client, project.id, project.full_name
        )
    await session.commit()
    return count
