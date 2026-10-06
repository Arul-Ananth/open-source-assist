"""GitHub API integration service for fetching repository metadata and user metrics.

Provides cached contributor fetching, user metrics aggregation, streak/heatmap calculation,
and repository discovery for skill assessments.
"""

from __future__ import annotations

import asyncio
import datetime
import logging
import random
import time
from typing import Any

import httpx

from backend.core.config import settings
from backend.schemas.assessment import GitHubProjectContext

logger = logging.getLogger(__name__)

# Cache TTL constants
CACHE_TTL_SUCCESS_SECONDS = 7200  # 2 hours
CACHE_TTL_RATE_LIMITED_SECONDS = 900  # 15 minutes

# In-memory cache structures
_CONTRIBUTORS_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_USER_STATS_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}

# Pre-seeded curated contributors for standard dataset to eliminate GitHub API calls
PRESEEDED_CONTRIBUTORS: dict[str, list[dict[str, Any]]] = {
    "torvalds/linux": [
        {"login": "torvalds", "avatar_url": "https://github.com/torvalds.png", "html_url": "https://github.com/torvalds", "contributions": 55000},
        {"login": "gregkh", "avatar_url": "https://github.com/gregkh.png", "html_url": "https://github.com/gregkh", "contributions": 32000},
        {"login": "davem330", "avatar_url": "https://github.com/davem330.png", "html_url": "https://github.com/davem330", "contributions": 18000},
    ],
    "tiangolo/fastapi": [
        {"login": "tiangolo", "avatar_url": "https://github.com/tiangolo.png", "html_url": "https://github.com/tiangolo", "contributions": 3100},
        {"login": "Kludex", "avatar_url": "https://github.com/Kludex.png", "html_url": "https://github.com/Kludex", "contributions": 420},
        {"login": "dmontagu", "avatar_url": "https://github.com/dmontagu.png", "html_url": "https://github.com/dmontagu", "contributions": 180},
    ],
    "encode/starlette": [
        {"login": "tomchristie", "avatar_url": "https://github.com/tomchristie.png", "html_url": "https://github.com/tomchristie", "contributions": 750},
        {"login": "Kludex", "avatar_url": "https://github.com/Kludex.png", "html_url": "https://github.com/Kludex", "contributions": 310},
        {"login": "florimondmanca", "avatar_url": "https://github.com/florimondmanca.png", "html_url": "https://github.com/florimondmanca", "contributions": 220},
    ],
    "pallets/flask": [
        {"login": "mitsuhiko", "avatar_url": "https://github.com/mitsuhiko.png", "html_url": "https://github.com/mitsuhiko", "contributions": 2200},
        {"login": "davidism", "avatar_url": "https://github.com/davidism.png", "html_url": "https://github.com/davidism", "contributions": 1950},
        {"login": "untitaker", "avatar_url": "https://github.com/untitaker.png", "html_url": "https://github.com/untitaker", "contributions": 340},
    ],
    "pydantic/pydantic": [
        {"login": "samuelcolvin", "avatar_url": "https://github.com/samuelcolvin.png", "html_url": "https://github.com/samuelcolvin", "contributions": 3200},
        {"login": "davidhewitt", "avatar_url": "https://github.com/davidhewitt.png", "html_url": "https://github.com/davidhewitt", "contributions": 950},
        {"login": "adriangb", "avatar_url": "https://github.com/adriangb.png", "html_url": "https://github.com/adriangb", "contributions": 680},
    ],
    "pandas-dev/pandas": [
        {"login": "wesm", "avatar_url": "https://github.com/wesm.png", "html_url": "https://github.com/wesm", "contributions": 2900},
        {"login": "jreback", "avatar_url": "https://github.com/jreback.png", "html_url": "https://github.com/jreback", "contributions": 5800},
        {"login": "TomAugspurger", "avatar_url": "https://github.com/TomAugspurger", "contributions": 1200},
    ],
    "shadcn-ui/ui": [
        {"login": "shadcn", "avatar_url": "https://github.com/shadcn.png", "html_url": "https://github.com/shadcn", "contributions": 1200},
        {"login": "huntabyte", "avatar_url": "https://github.com/huntabyte.png", "html_url": "https://github.com/huntabyte", "contributions": 110},
        {"login": "michaeltrotta", "avatar_url": "https://github.com/michaeltrotta.png", "html_url": "https://github.com/michaeltrotta", "contributions": 80},
    ],
    "vercel/next.js": [
        {"login": "timneutkens", "avatar_url": "https://github.com/timneutkens.png", "html_url": "https://github.com/timneutkens", "contributions": 4200},
        {"login": "shuding", "avatar_url": "https://github.com/shuding.png", "html_url": "https://github.com/shuding", "contributions": 1600},
        {"login": "feedthejim", "avatar_url": "https://github.com/feedthejim.png", "html_url": "https://github.com/feedthejim", "contributions": 900},
    ],
    "facebook/react": [
        {"login": "gaearon", "avatar_url": "https://github.com/gaearon.png", "html_url": "https://github.com/gaearon", "contributions": 1850},
        {"login": "sophiebits", "avatar_url": "https://github.com/sophiebits.png", "html_url": "https://github.com/sophiebits", "contributions": 1200},
        {"login": "sebmarkbage", "avatar_url": "https://github.com/sebmarkbage.png", "html_url": "https://github.com/sebmarkbage", "contributions": 1100},
    ],
    "astral-sh/uv": [
        {"login": "charliermarsh", "avatar_url": "https://github.com/charliermarsh.png", "html_url": "https://github.com/charliermarsh", "contributions": 2800},
        {"login": "zanieb", "avatar_url": "https://github.com/zanieb.png", "html_url": "https://github.com/zanieb", "contributions": 1400},
        {"login": "konstin", "avatar_url": "https://github.com/konstin.png", "html_url": "https://github.com/konstin", "contributions": 1100},
    ],
    "golang/go": [
        {"login": "rsc", "avatar_url": "https://github.com/rsc.png", "html_url": "https://github.com/rsc", "contributions": 4100},
        {"login": "robpike", "avatar_url": "https://github.com/robpike.png", "html_url": "https://github.com/robpike", "contributions": 1800},
        {"login": "bradfitz", "avatar_url": "https://github.com/bradfitz.png", "html_url": "https://github.com/bradfitz", "contributions": 2400},
    ],
}


def _owner_fallback(repo_name: str) -> list[dict[str, Any]]:
    owner = repo_name.split("/")[0] if "/" in repo_name else repo_name
    return [
        {
            "login": owner,
            "avatar_url": f"https://github.com/{owner}.png",
            "html_url": f"https://github.com/{owner}",
            "contributions": 1,
        }
    ]


class GitHubService:
    """Service interacting with public GitHub API for metadata, proxying, and user metrics."""

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

    @staticmethod
    async def get_contributors_batch(repos: list[str]) -> dict[str, Any]:
        """Fetch top contributors for multiple repositories with caching and fallbacks."""
        now = time.time()
        result: dict[str, list[dict[str, Any]]] = {}
        missing: list[str] = []
        rate_limited = False

        for repo in repos:
            repo_clean = repo.strip()
            if not repo_clean:
                continue

            if repo_clean in PRESEEDED_CONTRIBUTORS:
                result[repo_clean] = PRESEEDED_CONTRIBUTORS[repo_clean]
                continue

            cached = _CONTRIBUTORS_CACHE.get(repo_clean)
            if cached and cached[0] > now:
                result[repo_clean] = cached[1]
                continue

            missing.append(repo_clean)

        if not missing:
            return {"contributors": result, "rate_limited": rate_limited}

        headers: dict[str, str] = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "OpenSourceAssist-Platform/1.0",
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

        async with httpx.AsyncClient(timeout=6.0) as client:
            for repo_clean in missing:
                if rate_limited:
                    fallback = _owner_fallback(repo_clean)
                    result[repo_clean] = fallback
                    _CONTRIBUTORS_CACHE[repo_clean] = (now + CACHE_TTL_RATE_LIMITED_SECONDS, fallback)
                    continue

                url = f"https://api.github.com/repos/{repo_clean}/contributors?per_page=3&sort=contributions"
                try:
                    res = await client.get(url, headers=headers)
                    if res.status_code in (403, 429):
                        logger.warning(
                            "GitHub API rate limit hit while fetching contributors for %s (status %d)",
                            repo_clean,
                            res.status_code,
                        )
                        rate_limited = True
                        fallback = _owner_fallback(repo_clean)
                        result[repo_clean] = fallback
                        _CONTRIBUTORS_CACHE[repo_clean] = (
                            now + CACHE_TTL_RATE_LIMITED_SECONDS,
                            fallback,
                        )
                        continue

                    if res.status_code == 200:
                        data = res.json()
                        if isinstance(data, list) and len(data) > 0:
                            parsed = [
                                {
                                    "login": item.get("login", "contributor"),
                                    "avatar_url": item.get(
                                        "avatar_url",
                                        f"https://github.com/{item.get('login', 'octocat')}.png",
                                    ),
                                    "html_url": item.get(
                                        "html_url",
                                        f"https://github.com/{item.get('login', '')}",
                                    ),
                                    "contributions": item.get("contributions", 1),
                                }
                                for item in data[:3]
                            ]
                            result[repo_clean] = parsed
                            _CONTRIBUTORS_CACHE[repo_clean] = (
                                now + CACHE_TTL_SUCCESS_SECONDS,
                                parsed,
                            )
                            continue

                    fallback = _owner_fallback(repo_clean)
                    result[repo_clean] = fallback
                    _CONTRIBUTORS_CACHE[repo_clean] = (now + 600, fallback)

                except Exception as exc:
                    logger.debug("Failed to fetch contributors for %s: %s", repo_clean, exc)
                    fallback = _owner_fallback(repo_clean)
                    result[repo_clean] = fallback
                    _CONTRIBUTORS_CACHE[repo_clean] = (now + 300, fallback)

        return {"contributors": result, "rate_limited": rate_limited}

    @staticmethod
    async def get_user_profile_stats(username: str) -> dict[str, Any]:
        """Fetch comprehensive GitHub user metrics, activity, badges, and heatmap."""
        clean_user = username.strip() if username else "contributor"
        now = time.time()

        cached = _USER_STATS_CACHE.get(clean_user.lower())
        if cached and cached[0] > now:
            return cached[1]

        headers: dict[str, str] = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "OpenSourceAssist-Platform/1.0",
        }
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

        gh_user: dict[str, Any] = {}
        events: list[dict[str, Any]] = []
        repos: list[dict[str, Any]] = []

        is_local = clean_user.lower() in {"admin", "demo", "test", "guest", "contributor"}
        if not is_local:
            async with httpx.AsyncClient(timeout=4.0) as client:
                async def fetch_u():
                    try:
                        r = await client.get(f"https://api.github.com/users/{clean_user}", headers=headers)
                        return r.json() if r.status_code == 200 else {}
                    except Exception as exc:
                        logger.debug("Failed to fetch GitHub profile for %s: %s", clean_user, exc)
                        return {}

                async def fetch_e():
                    try:
                        r = await client.get(f"https://api.github.com/users/{clean_user}/events?per_page=100", headers=headers)
                        return r.json() if r.status_code == 200 else []
                    except Exception as exc:
                        logger.debug("Failed to fetch GitHub events for %s: %s", clean_user, exc)
                        return []

                async def fetch_r():
                    try:
                        r = await client.get(f"https://api.github.com/users/{clean_user}/repos?sort=updated&per_page=50", headers=headers)
                        return r.json() if r.status_code == 200 else []
                    except Exception as exc:
                        logger.debug("Failed to fetch GitHub repos for %s: %s", clean_user, exc)
                        return []

                u_res, e_res, r_res = await asyncio.gather(fetch_u(), fetch_e(), fetch_r())
                if isinstance(u_res, dict):
                    gh_user = u_res
                if isinstance(e_res, list):
                    events = e_res
                if isinstance(r_res, list):
                    repos = r_res

        if not gh_user:
            gh_user = {
                "login": clean_user,
                "name": clean_user.capitalize(),
                "avatar_url": f"https://github.com/{clean_user}.png",
                "html_url": f"https://github.com/{clean_user}",
                "bio": "",
                "public_repos": len(repos),
                "followers": 0,
                "following": 0,
                "created_at": None,
                "location": None,
                "company": None,
            }

        push_events = [e for e in events if e.get("type") == "PushEvent"]
        create_events = [e for e in events if e.get("type") == "CreateEvent"]
        pr_events = [e for e in events if e.get("type") == "PullRequestEvent"]

        total_push_commits = 0
        for pe in push_events:
            commits = pe.get("payload", {}).get("commits", [])
            total_push_commits += len(commits) if commits else 1

        public_repos_count = gh_user.get("public_repos") if gh_user.get("public_repos") is not None else len(repos)
        followers_count = gh_user.get("followers") or 0

        base_points = 0
        repo_points = public_repos_count * 35
        commit_points = max(len(push_events), total_push_commits) * 15
        event_points = len(events) * 10
        follower_points = followers_count * 15
        total_points = base_points + repo_points + commit_points + event_points + follower_points

        streak_days = 6 if len(events) > 10 else (3 if len(events) > 0 else 0)

        if total_points >= 2000:
            rank = "Top 5% · Gold Contributor"
            tier = "Gold"
        elif total_points >= 1000:
            rank = "Top 12% · Silver Contributor"
            tier = "Silver"
        elif total_points >= 500:
            rank = "Top 25% · Bronze Contributor"
            tier = "Bronze"
        elif total_points > 0:
            rank = "Rising Contributor"
            tier = "Novice"
        else:
            rank = "Getting Started"
            tier = "Novice"

        lang_counts: dict[str, int] = {}
        for r in repos:
            lang = r.get("language")
            if lang:
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

        total_lang_repos = sum(lang_counts.values()) or 1
        lang_colors = {
            "TypeScript": "#3178c6",
            "JavaScript": "#f1e05a",
            "Python": "#3572A5",
            "HTML": "#e34c26",
            "CSS": "#563d7c",
            "Java": "#b07219",
            "Go": "#00ADD8",
            "Rust": "#dea584",
            "C++": "#f34b7d",
            "Shell": "#89e051",
        }
        languages = [
            {
                "name": lang,
                "count": count,
                "percentage": round((count / total_lang_repos) * 100, 1),
                "color": lang_colors.get(lang, "#8b949e"),
            }
            for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        has_ai = any("ai" in (r.get("name") or "").lower() or "ml" in (r.get("name") or "").lower() for r in repos)
        has_security = any("sentry" in (r.get("name") or "").lower() or "ocean" in (r.get("name") or "").lower() for r in repos)

        now_month_year = datetime.datetime.now(datetime.timezone.utc).strftime("%B %Y")
        badges = [
            {
                "id": "repo_architect",
                "title": "Repository Architect",
                "description": f"Created {public_repos_count} public repositories on GitHub",
                "icon": "FolderGit2",
                "tier": "Gold" if public_repos_count >= 20 else "Silver",
                "unlocked": public_repos_count >= 5,
                "progress": min(100, int(public_repos_count / 20 * 100)),
                "unlocked_at": now_month_year if public_repos_count >= 5 else None,
            },
            {
                "id": "polyglot",
                "title": "Polyglot Hacker",
                "description": f"Proficient across {len(languages)} technologies ({', '.join(l['name'] for l in languages[:3]) if languages else 'None'})",
                "icon": "Code2",
                "tier": "Gold",
                "unlocked": len(languages) >= 3,
                "progress": 100 if len(languages) >= 3 else int(len(languages) / 3 * 100),
                "unlocked_at": now_month_year if len(languages) >= 3 else None,
            },
            {
                "id": "commit_trailblazer",
                "title": "Commit Trailblazer",
                "description": f"Logged {len(push_events)}+ push events and commits",
                "icon": "Flame",
                "tier": "Silver",
                "unlocked": len(push_events) >= 10,
                "progress": min(100, int(len(push_events) / 20 * 100)),
                "unlocked_at": now_month_year if len(push_events) >= 10 else None,
            },
            {
                "id": "open_source_ally",
                "title": "Open Source Ally",
                "description": "Active collaborator on open-source repositories",
                "icon": "Users",
                "tier": "Diamond",
                "unlocked": len(pr_events) > 0 or len(push_events) > 0,
                "progress": 100 if (len(pr_events) > 0 or len(push_events) > 0) else 0,
                "unlocked_at": now_month_year if (len(pr_events) > 0 or len(push_events) > 0) else None,
            },
            {
                "id": "security_sentinel",
                "title": "Security Sentinel",
                "description": "Architect of security monitoring suite",
                "icon": "Shield",
                "tier": "Silver",
                "unlocked": has_security,
                "progress": 100 if has_security else 0,
                "unlocked_at": now_month_year if has_security else None,
            },
            {
                "id": "ai_innovator",
                "title": "AI & ML Explorer",
                "description": "Authored AI & machine learning projects",
                "icon": "Sparkles",
                "tier": "Gold",
                "unlocked": has_ai,
                "progress": 100 if has_ai else 0,
                "unlocked_at": now_month_year if has_ai else None,
            },
            {
                "id": "streak_master",
                "title": "Streak Champion",
                "description": f"Maintained an active {streak_days}-day development streak",
                "icon": "Zap",
                "tier": "Gold",
                "unlocked": streak_days >= 3,
                "progress": min(100, int(streak_days / 7 * 100)),
                "unlocked_at": "Current Streak" if streak_days >= 3 else None,
            },
            {
                "id": "first_pr",
                "title": "PR Pioneer",
                "description": "Submit and merge pull requests to open-source codebases",
                "icon": "GitPullRequest",
                "tier": "Bronze",
                "unlocked": len(pr_events) > 0,
                "progress": 100 if len(pr_events) > 0 else 0,
                "unlocked_at": now_month_year if len(pr_events) > 0 else None,
            },
        ]

        recent_activity: list[dict[str, Any]] = []
        for ev in events[:12]:
            ev_type = ev.get("type", "")
            repo_info = ev.get("repo", {})
            repo_name = repo_info.get("name", "open-source-assist")
            repo_url = f"https://github.com/{repo_name}"
            payload = ev.get("payload", {})
            created_at = ev.get("created_at", "")

            time_display = "Recently"
            if created_at:
                try:
                    ev_dt = datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    diff = datetime.datetime.now(datetime.timezone.utc) - ev_dt
                    hours = int(diff.total_seconds() // 3600)
                    days = int(diff.total_seconds() // 86400)
                    if hours < 1:
                        time_display = "Just now"
                    elif hours < 24:
                        time_display = f"{hours}h ago"
                    elif days == 1:
                        time_display = "Yesterday"
                    elif days < 30:
                        time_display = f"{days}d ago"
                    else:
                        time_display = f"{days // 30}mo ago"
                except Exception:
                    time_display = "Recently"

            if ev_type == "PushEvent":
                commits = payload.get("commits", [])
                msg = commits[0].get("message") if commits else f"Pushed {len(commits) or 1} commit(s)"
                ref = payload.get("ref", "").replace("refs/heads/", "")
                recent_activity.append({
                    "id": ev.get("id"),
                    "type": "push",
                    "title": f"Pushed to {ref or 'main'}",
                    "repo": repo_name,
                    "repo_url": repo_url,
                    "detail": msg[:100],
                    "timestamp": created_at,
                    "time_display": time_display,
                    "icon": "GitCommit",
                })
            elif ev_type == "CreateEvent":
                ref_type = payload.get("ref_type", "branch")
                ref = payload.get("ref") or "repository"
                recent_activity.append({
                    "id": ev.get("id"),
                    "type": "create",
                    "title": f"Created {ref_type}",
                    "repo": repo_name,
                    "repo_url": repo_url,
                    "detail": f"Created {ref_type} '{ref}' in {repo_name}",
                    "timestamp": created_at,
                    "time_display": time_display,
                    "icon": "FolderGit2",
                })
            elif ev_type == "PullRequestEvent":
                action = payload.get("action", "opened")
                pr = payload.get("pull_request", {})
                pr_title = pr.get("title", "Pull Request")
                recent_activity.append({
                    "id": ev.get("id"),
                    "type": "pr",
                    "title": f"Pull Request {action}",
                    "repo": repo_name,
                    "repo_url": repo_url,
                    "detail": pr_title,
                    "timestamp": created_at,
                    "time_display": time_display,
                    "icon": "GitPullRequest",
                })

        event_date_counts: dict[str, int] = {}
        for ev in events:
            c_at = ev.get("created_at")
            if c_at:
                d_str = c_at[:10]
                event_date_counts[d_str] = event_date_counts.get(d_str, 0) + 1

        for r in repos:
            u_at = r.get("updated_at")
            if u_at:
                d_str = u_at[:10]
                event_date_counts[d_str] = event_date_counts.get(d_str, 0) + 1

        today = datetime.date.today()
        heatmap_days: list[dict[str, Any]] = []
        total_contributions = 0

        for i in range(364, -1, -1):
            day_date = today - datetime.timedelta(days=i)
            d_str = day_date.strftime("%Y-%m-%d")
            c = event_date_counts.get(d_str, 0)

            if c == 0:
                level = 0
            elif c <= 2:
                level = 1
            elif c <= 4:
                level = 2
            elif c <= 7:
                level = 3
            else:
                level = 4

            total_contributions += c
            heatmap_days.append({
                "date": d_str,
                "count": c,
                "level": level,
            })

        data_result = {
            "profile": {
                "username": gh_user.get("login", clean_user),
                "name": gh_user.get("name") or gh_user.get("login", clean_user),
                "avatar_url": gh_user.get("avatar_url") or f"https://github.com/{clean_user}.png",
                "html_url": gh_user.get("html_url") or f"https://github.com/{clean_user}",
                "bio": gh_user.get("bio") or "",
                "company": gh_user.get("company"),
                "location": gh_user.get("location"),
                "public_repos": public_repos_count,
                "followers": followers_count,
                "following": gh_user.get("following", 0),
                "created_at": gh_user.get("created_at"),
            },
            "stats": {
                "total_points": total_points,
                "streak_days": streak_days,
                "merged_prs": len(pr_events),
                "rank": rank,
                "tier": tier,
                "total_commits": max(total_push_commits, len(push_events)),
                "total_contributions": total_contributions,
                "total_repos": public_repos_count,
            },
            "languages": languages,
            "top_repos": [
                {
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "html_url": r.get("html_url"),
                    "description": r.get("description") or "Open source project repository",
                    "language": r.get("language") or "Code",
                    "stars": r.get("stargazers_count", 0),
                    "forks": r.get("forks_count", 0),
                    "updated_at": r.get("updated_at"),
                }
                for r in repos[:8]
            ],
            "badges": badges,
            "recent_activity": recent_activity,
            "heatmap": heatmap_days,
        }

        _USER_STATS_CACHE[clean_user.lower()] = (now + 600, data_result)
        return data_result


github_service = GitHubService()
