import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.api.dependencies import get_current_user
from backend.core.config import settings
from backend.core.database import get_db
from backend.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GitHubAuthUrlResponse,
    GitHubCodeRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignupRequest,
    TokenResponse,
    UserProfileResponse,
    VerifySignupOTPRequest,
)
from backend.services.auth_service import AuthService
from backend.services.github_oauth_service import GitHubOAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def signup(
    payload: SignupRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Initiate registration by validating payload and dispatching an email verification OTP.
    
    The user is not persisted to the database until OTP verification is completed.
    """
    try:
        await AuthService.request_signup(
            db,
            payload.email,
            payload.password,
            payload.confirm_password,
            payload.username,
        )
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Signup dispatch failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please check your network and try again.",
        ) from exc
    return MessageResponse(message="Verification code sent to your email")


@router.post(
    "/verify-signup-otp", response_model=AuthResponse, status_code=status.HTTP_201_CREATED
)
async def verify_signup_otp(
    payload: VerifySignupOTPRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthResponse:
    """Verify signup OTP, persist user into the database, and issue access token."""
    try:
        token = await AuthService.verify_signup_otp(db, payload.email, payload.otp)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Signup verification failed unexpectedly: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Verification could not be processed. Please try again.",
        ) from exc
    return AuthResponse(
        access_token=token,
        message="User registered and verified successfully",
    )


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    payload: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Verify user credentials and return signed access token."""
    try:
        token, user = await AuthService.login(db, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return TokenResponse(
        access_token=token,
        user=UserProfileResponse(
            id=str(user.id),
            email=user.email,
            username=user.username,
            github_username=user.github_username,
            skill_level=user.skill_level,
            user_context=user.user_context,
            role=getattr(user, "role", "user"),
            account_status=getattr(user, "account_status", "active"),
        ),
    )


@router.post("/forgot-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Issue a password-reset OTP without leaking account existence."""
    await AuthService.request_password_reset(db, payload.email)
    return MessageResponse(message="If the account exists, a reset code has been sent")


@router.post("/reset-password", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    """Verify a single-use OTP and replace the account password."""
    try:
        await AuthService.reset_password(db, payload.email, payload.otp, payload.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Password reset successfully")


@router.get("/me", response_model=UserProfileResponse, status_code=status.HTTP_200_OK)
async def get_me(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
) -> UserProfileResponse:
    """Return profile details for the currently authenticated user."""
    return UserProfileResponse(
        id=current_user["user_id"],
        email=current_user["email"],
        username=current_user.get("username"),
        github_username=current_user.get("github_username"),
        skill_level=current_user.get("skill_level"),
        user_context=current_user.get("user_context"),
        role=current_user.get("role", "user"),
        account_status=current_user.get("account_status", "active"),
    )


@router.get(
    "/github/url",
    response_model=GitHubAuthUrlResponse,
    status_code=status.HTTP_200_OK,
    summary="Get GitHub OAuth Authorization URL",
)
async def get_github_oauth_url(
    state: str | None = None,
    redirect_uri: str | None = None,
) -> GitHubAuthUrlResponse:
    """Return the GitHub OAuth authorization URL and configuration status."""
    configured = GitHubOAuthService.is_configured()
    url = None
    if configured:
        url = GitHubOAuthService.get_authorization_url(state=state, redirect_uri=redirect_uri)
    return GitHubAuthUrlResponse(
        configured=configured,
        url=url,
        has_pat=bool(settings.GITHUB_TOKEN and settings.GITHUB_TOKEN.strip()),
    )


@router.get(
    "/github/callback",
    summary="Handle GitHub OAuth Browser Callback",
    response_class=RedirectResponse,
)
async def github_oauth_callback(
    code: str | None = None,
    error: str | None = None,
    error_description: str | None = None,
    state: str | None = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> RedirectResponse:
    """Handle the redirect back from GitHub authorization."""
    import urllib.parse

    if error:
        err_msg = error_description or error
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/?oauth_error={urllib.parse.quote(err_msg)}"
        )
    if not code:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/?oauth_error={urllib.parse.quote('No authorization code received from GitHub')}"
        )

    try:
        access_token = await GitHubOAuthService.exchange_code_for_token(code)
        profile = await GitHubOAuthService.fetch_github_user(access_token)
        user, token = await GitHubOAuthService.authenticate_or_register(
            db, profile, access_token=access_token
        )
        params = {
            "oauth_token": token,
            "username": user.username or profile.get("login", ""),
            "email": user.email,
            "avatar_url": profile.get("avatar_url", ""),
        }
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/?{urllib.parse.urlencode(params)}"
        )
    except Exception as exc:
        logger.error("GitHub OAuth callback failed: %s", exc, exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/?oauth_error={urllib.parse.quote(str(exc))}"
        )


@router.post(
    "/github/callback",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Exchange GitHub OAuth Code for JWT Token",
)
async def post_github_callback(
    payload: GitHubCodeRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthResponse:
    """Exchange GitHub OAuth code for application JWT token."""
    try:
        access_token = await GitHubOAuthService.exchange_code_for_token(
            payload.code, redirect_uri=payload.redirect_uri
        )
        profile = await GitHubOAuthService.fetch_github_user(access_token)
        user, token = await GitHubOAuthService.authenticate_or_register(
            db, profile, access_token=access_token
        )
        return AuthResponse(
            access_token=token,
            message=f"Logged in as @{user.username or profile.get('login')}",
        )
    except Exception as exc:
        logger.error("GitHub OAuth code exchange failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/github/pat-login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Log In with Server Connected GitHub Token in Development",
)
async def github_pat_login(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthResponse:
    """Log in using the connected GitHub PAT profile in development."""
    if not settings.GITHUB_TOKEN or not settings.GITHUB_TOKEN.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No GITHUB_TOKEN configured in server environment",
        )
    try:
        pat_token = settings.GITHUB_TOKEN.strip()
        profile = await GitHubOAuthService.fetch_github_user(pat_token)
        user, token = await GitHubOAuthService.authenticate_or_register(
            db, profile, access_token=pat_token
        )
        return AuthResponse(
            access_token=token,
            message=f"Logged in via connected GitHub account @{user.username or profile.get('login')}",
        )
    except Exception as exc:
        logger.error("GitHub PAT login failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

