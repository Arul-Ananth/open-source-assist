"""Email delivery boundary service for verification and password reset notifications."""

import logging

logger = logging.getLogger(__name__)


async def send_signup_verification_otp(email: str, otp: str) -> None:
    """Mock dispatcher for email verification OTP during registration."""
    # Plaintext OTP is never logged in production log streams for privacy and security.
    logger.info("Signup verification OTP dispatched for %s", email)


async def send_password_reset_otp(email: str, otp: str) -> None:
    """Mock dispatcher for password reset OTP."""
    logger.info("Password reset OTP dispatched for %s", email)

