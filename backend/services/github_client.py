"""Async GitHub REST API client with rate-limit handling and retry logic."""

import asyncio
import random
from datetime import datetime, timezone
from typing import Any

import httpx

from backend.core.config import settings


class GitHubAPIError(RuntimeError):
    def __init__(
        self,
        message: str,
        status_code: int = 502,
        retry_after: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.retry_after = retry_after


class GitHubClient:
    base_url = "https://api.github.com"

    def __init__(self, token: str | None = None) -> None:
        self.token = token or settings.GITHUB_TOKEN
        if not self.token:
            raise RuntimeError("GITHUB_TOKEN is not configured")
        self.headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        self.min_request_interval = settings.GITHUB_MIN_REQUEST_INTERVAL
        self.max_retries = settings.GITHUB_MAX_RETRIES
        self._last_request_at = 0.0

    async def __aenter__(self) -> "GitHubClient":
        self._client = httpx.AsyncClient(timeout=30)
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self._client.aclose()

    async def _wait_before_request(self) -> None:
        loop_time = asyncio.get_running_loop().time()
        wait_for = self.min_request_interval - (loop_time - self._last_request_at)
        if wait_for > 0:
            await asyncio.sleep(wait_for)
        self._last_request_at = asyncio.get_running_loop().time()

    async def _get(self, path: str, **params: Any) -> Any:
        for attempt in range(self.max_retries + 1):
            await self._wait_before_request()
            response = await self._client.get(
                f"{self.base_url}{path}",
                params=params,
                headers=self.headers,
            )
            if not response.is_error:
                return response.json()

            retry_after = response.headers.get("retry-after")
            remaining = response.headers.get("x-ratelimit-remaining")
            reset = response.headers.get("x-ratelimit-reset")
            secondary_limit = response.status_code in {403, 429} and (
                retry_after or "secondary rate limit" in response.text.lower()
            )

            if secondary_limit and attempt < self.max_retries:
                if retry_after:
                    delay = float(retry_after)
                elif reset and remaining == "0":
                    delay = max(
                        1,
                        int(reset)
                        - int(datetime.now(timezone.utc).timestamp()),
                    )
                else:
                    delay = min(60, 2**attempt * 5 + random.random())
                await asyncio.sleep(delay)
                continue

            raise GitHubAPIError(
                f"GitHub returned {response.status_code}: {response.text[:500]}",
                status_code=429 if secondary_limit else 502,
                retry_after=retry_after,
            )

        raise GitHubAPIError("GitHub request failed after retries")

    async def search_repositories(
        self, per_page: int = 25, max_pages: int = 1
    ) -> list[dict[str, Any]]:
        repositories: list[dict[str, Any]] = []
        for page in range(1, max_pages + 1):
            payload = await self._get(
                "/search/repositories",
                q="is:public archived:false",
                sort="stars",
                order="desc",
                page=page,
                per_page=min(per_page, 100),
            )
            batch = payload.get("items", [])
            repositories.extend(batch)
            if len(batch) < per_page:
                break
        return repositories

    async def list_contributors(
        self, full_name: str, per_page: int = 10
    ) -> list[dict[str, Any]]:
        return await self._get(
            f"/repos/{full_name}/contributors",
            per_page=min(per_page, 100),
        )

    async def get_user(self, username: str) -> dict[str, Any]:
        return await self._get(f"/users/{username}")
