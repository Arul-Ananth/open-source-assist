"""GitHub API integration service for fetching repository metadata."""

import logging
import httpx
from backend.schemas.assessment import GitHubProjectContext

logger = logging.getLogger(__name__)


class GitHubService:
    """Service interacting with public GitHub API for user repository discovery."""

    def __init__(self, timeout_seconds: float = 10.0):
        self.timeout_seconds = timeout_seconds

    async def fetch_user_repositories(
        self, username: str, limit: int = 5
    ) -> list[GitHubProjectContext]:
        """Fetch public repositories for a given GitHub username."""
        url = f"https://api.github.com/users/{username}/repos"
        params = {"sort": "updated", "per_page": limit}
        headers = {"User-Agent": "Open-Source-Assist-Backend"}

        projects: list[GitHubProjectContext] = []
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code == 200:
                    repos_data = response.json()
                    for repo in repos_data:
                        projects.append(
                            GitHubProjectContext(
                                repo_name=repo.get("name", "unknown"),
                                description=repo.get("description"),
                                primary_language=repo.get("language"),
                                topics=repo.get("topics", []),
                                readme_summary=f"Public repository '{repo.get('name')}' written in {repo.get('language') or 'various languages'}.",
                            )
                        )
                else:
                    logger.warning(
                        "GitHub API returned status %s for user '%s'", response.status_code, username
                    )
        except Exception as exc:
            logger.warning("Failed to fetch GitHub repos for '%s': %s", username, exc)

        return projects


github_service = GitHubService()
