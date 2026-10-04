"""GitHub OAuth Web Flow service for user authentication."""

from __future__ import annotations

import logging
import urllib.parse
import uuid
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.core.jwt import create_access_token
from backend.models.user_model import User

logger = logging.getLogger(__name__)

GITHUB_OAUTH_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_OAUTH_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_API_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_API_URL = "https://api.github.com/user/emails"


class GitHubOAuthService:
    """Handles GitHub OAuth 2.0 Web Application Flow."""

    @staticmethod
    def is_configured() -> bool:
        """Check if OAuth Client ID and Secret are configured."""
        return bool(
            settings.GITHUB_CLIENT_ID
            and settings.GITHUB_CLIENT_SECRET
            and settings.GITHUB_CLIENT_ID.strip()
            and settings.GITHUB_CLIENT_SECRET.strip()
        )

    @classmethod
    def get_authorization_url(
        cls, state: str | None = None, redirect_uri: str | None = None
    ) -> str:
        """Generate GitHub OAuth authorization URL."""
        if not cls.is_configured():
            raise ValueError(
                "GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and "
                "GITHUB_CLIENT_SECRET in your .env file."
            )

        cb_url = redirect_uri or settings.GITHUB_REDIRECT_URI or f"{settings.FRONTEND_URL}/api/v1/auth/github/callback"
        params: dict[str, str] = {
            "client_id": settings.GITHUB_CLIENT_ID.strip(),
            "scope": "read:user,user:email",
            "redirect_uri": cb_url,
        }
        if state:
            params["state"] = state

        return f"{GITHUB_OAUTH_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"

    @classmethod
    async def exchange_code_for_token(
        cls, code: str, redirect_uri: str | None = None
    ) -> str:
        """Exchange authorization code for GitHub access token."""
        if not cls.is_configured():
            raise ValueError("GitHub OAuth credentials not configured.")

        cb_url = redirect_uri or settings.GITHUB_REDIRECT_URI or f"{settings.FRONTEND_URL}/api/v1/auth/github/callback"
        payload = {
            "client_id": settings.GITHUB_CLIENT_ID.strip(),
            "client_secret": settings.GITHUB_CLIENT_SECRET.strip(),
            "code": code.strip(),
            "redirect_uri": cb_url,
        }
        headers = {
            "Accept": "application/json",
            "User-Agent": "OpenSourceAssist-OAuth/1.0",
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            res = await client.post(GITHUB_OAUTH_TOKEN_URL, json=payload, headers=headers)
            if res.status_code != 200:
                raise ValueError(f"GitHub token exchange returned HTTP {res.status_code}")

            data = res.json()
            if "error" in data:
                err_desc = data.get("error_description", data["error"])
                raise ValueError(f"GitHub OAuth error: {err_desc}")

            token = data.get("access_token")
            if not token:
                raise ValueError("No access token in GitHub response.")
            return str(token)

    @classmethod
    async def fetch_github_user(cls, access_token: str) -> dict[str, Any]:
        """Fetch profile and email for authenticated GitHub user."""
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "OpenSourceAssist-OAuth/1.0",
        }

        async with httpx.AsyncClient(timeout=12.0) as client:
            user_res = await client.get(GITHUB_USER_API_URL, headers=headers)
            if user_res.status_code != 200:
                raise ValueError(f"Failed to fetch GitHub profile (HTTP {user_res.status_code})")
            user_data = user_res.json()

            primary_email = user_data.get("email")

            # If user's email is private, query the user/emails endpoint
            if not primary_email:
                try:
                    emails_res = await client.get(GITHUB_USER_EMAILS_API_URL, headers=headers)
                    if emails_res.status_code == 200:
                        emails_list = emails_res.json()
                        if isinstance(emails_list, list):
                            for e in emails_list:
                                if e.get("primary") and e.get("verified"):
                                    primary_email = e.get("email")
                                    break
                            if not primary_email and emails_list:
                                primary_email = emails_list[0].get("email")
                except Exception as exc:
                    logger.debug("Could not fetch secondary emails from GitHub: %s", exc)

            login = user_data.get("login") or "github_user"
            if not primary_email:
                primary_email = f"{login}@users.noreply.github.com"

            return {
                "github_id": user_data.get("id"),
                "login": login,
                "name": user_data.get("name") or login,
                "email": primary_email.strip().lower(),
                "avatar_url": user_data.get("avatar_url") or f"https://github.com/{login}.png",
            }

    @classmethod
    async def authenticate_or_register(
        cls, db: AsyncSession, profile: dict[str, Any]
    ) -> tuple[User, str]:
        """Find or register user from GitHub profile and issue JWT token."""
        normalized_email = profile["email"].strip().lower()

        user = await db.scalar(select(User).where(User.email == normalized_email))

        if user is None:
            # Create user from GitHub OAuth profile
            user = User(
                id=uuid.uuid4(),
                email=normalized_email,
                username=profile.get("login"),
                github_username=profile.get("login"),
                password_hash=f"oauth:github:{uuid.uuid4().hex}",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            logger.info("Created new user %s via GitHub OAuth", normalized_email)
        else:
            # Existing account: ensure active and username populated
            if not user.is_active:
                user.is_active = True
            if not user.username and profile.get("login"):
                user.username = profile.get("login")
            if not getattr(user, "github_username", None) and profile.get("login"):
                user.github_username = profile.get("login")
            await db.commit()
            await db.refresh(user)
            logger.info("Authenticated existing user %s via GitHub OAuth", normalized_email)

        token = create_access_token(str(user.id))
        return user, token
