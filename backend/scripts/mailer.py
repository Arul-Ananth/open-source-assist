"""Email delivery boundary; replace the mock with a provider adapter in production."""

import logging

logger = logging.getLogger(__name__)


async def send_password_reset_otp(email: str, otp: str) -> None:
    """Mock email sender that logs delivery without exposing the code in the API."""
    logger.info("Password reset OTP generated for %s: %s", email, otp)