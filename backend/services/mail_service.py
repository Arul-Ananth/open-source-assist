import logging
from email.message import EmailMessage

from aiosmtplib import SMTP

from backend.core.config import settings

logger = logging.getLogger(__name__)


async def _send_email(recipient: str, subject: str, body: str) -> None:
    """Send one message through the configured SMTP server."""
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD or not settings.MAIL_FROM:
        raise RuntimeError("SMTP_USERNAME, SMTP_PASSWORD, and MAIL_FROM must be configured")

    message = EmailMessage()
    message["From"] = settings.MAIL_FROM
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    smtp = SMTP(
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USERNAME,
        password=settings.SMTP_PASSWORD,
        start_tls=settings.SMTP_START_TLS,
        use_tls=settings.SMTP_USE_TLS,
        timeout=10.0,
    )
    try:
        await smtp.connect(timeout=10.0)
        await smtp.send_message(message, timeout=10.0)
        logger.info("Successfully delivered email to %s (subject: %s)", recipient, subject)
    except Exception as exc:
        logger.error(
            "Failed to send email to %s via SMTP (%s:%s): %s",
            recipient,
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            exc,
        )
        raise RuntimeError(f"Email delivery failed: {exc}") from exc
    finally:
        try:
            if smtp.is_connected:
                await smtp.quit()
        except Exception:
            pass


async def send_signup_verification_otp(email: str, otp: str) -> None:
    """Send the signup verification OTP to the requested email address."""
    logger.info("[AUTH] Verification OTP for %s: %s", email, otp)
    await _send_email(
        email,
        "Verify your Open Source Assist account",
        f"Your signup verification code is {otp}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.",
    )


async def send_password_reset_otp(email: str, otp: str) -> None:
    """Send the password reset OTP to the requested email address."""
    logger.info("[AUTH] Password reset OTP for %s: %s", email, otp)
    await _send_email(
        email,
        "Reset your Open Source Assist password",
        f"Your password reset code is {otp}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.",
    )

