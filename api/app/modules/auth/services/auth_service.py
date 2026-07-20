import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from altcha import ChallengeOptions
from altcha import create_challenge as altcha_create_challenge
from altcha import verify_solution as altcha_verify_solution
from fastapi import Depends, Request, Response

from app.core.config import Settings, get_settings
from app.core.database import SessionDep
from app.core.hashing import hash_password
from app.core.logging_config import get_logger
from app.core.enums.app_parameter import AppParameter
from app.core.enums.environment import Environment
from app.core.exceptions import (
    AuthenticationException,
    EmailSendException,
    PermissionDeniedException,
)
from app.core.security import get_token
from app.modules.auth.models import PasswordResetToken, RefreshToken
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import (
    AuthResponse,
    ForgotPasswordRequest,
    PublicAuthConfig,
    RegisterPayload,
    ResetPasswordRequest,
)
from app.modules.auth.services.email_service import EmailService
from app.modules.auth.services.google_auth import GoogleAuthService
from app.modules.users.schemas import UserCreate, UserDetail
from app.modules.users.service import UserService, UserServiceDep


_logger = get_logger("auth")


class AuthService:
    """Service for authentication operations."""

    def __init__(
        self,
        repository: AuthRepository,
        user_service: UserService,
        email_service: EmailService,
        google_auth_service: GoogleAuthService,
        settings: Settings,
    ):
        self.repository = repository
        self.user_service = user_service
        self.email_service = email_service
        self.google_auth_service = google_auth_service
        self.settings = settings

    def get_public_config(self) -> PublicAuthConfig:
        """Expose auth feature flags the frontend needs before the user logs in."""
        return PublicAuthConfig(
            allow_self_registration=self.settings.allow_self_registration
        )

    def get_captcha_challenge(self) -> dict:
        """Generate a new Altcha proof-of-work challenge."""
        challenge = altcha_create_challenge(
            ChallengeOptions(
                hmac_key=self.settings.altcha_hmac_key,
                expires=datetime.now(timezone.utc) + timedelta(minutes=10),
            )
        )
        return vars(challenge)

    def _validate_captcha(self, payload: str) -> None:
        """Verify an Altcha captcha solution payload."""
        if self.settings.env == Environment.TEST:
            return

        ok, _ = altcha_verify_solution(
            payload, self.settings.altcha_hmac_key, check_expires=True
        )
        if not ok:
            raise AuthenticationException(key="auth.captcha_invalid")

    def _hash_token(self, token: str) -> str:
        """Hash the refresh token for storage."""
        return hashlib.sha256(token.encode()).hexdigest()

    async def _issue_tokens(self, user: UserDetail, response: Response) -> AuthResponse:
        """Helper to issue access/refresh tokens and set cookie."""
        access_token_obj = get_token(user, settings=self.settings)
        refresh_token_str = await self.create_refresh_token(user.id)

        self.set_refresh_cookie(response, refresh_token_str)

        return AuthResponse(
            access_token=access_token_obj.access_token,
            token_type=access_token_obj.token_type,
            refresh_token=refresh_token_str,
        )

    async def register(self, payload: RegisterPayload) -> UserDetail:
        """Register a new user and send verification email."""
        if not self.settings.allow_self_registration:
            raise PermissionDeniedException(key="auth.registration_disabled")

        self._validate_captcha(payload.altcha_payload)

        user = UserCreate(
            email=payload.email, username=payload.username, password=payload.password
        )
        verification_token = secrets.token_urlsafe(AppParameter.TOKEN_LENGTH)
        new_user = await self.user_service.create_user(
            user, is_verified=False, verification_token=verification_token
        )
        if self.settings.smtp_host:
            await self.email_service.send_verification_email(
                payload.email, verification_token
            )
        _logger.info(
            "User registered",
            extra={"username": payload.username, "email": payload.email},
        )
        return new_user

    def set_refresh_cookie(self, response: Response, token: str) -> None:
        """Helper to set the refresh token cookie."""
        response.set_cookie(
            key=AppParameter.REFRESH_TOKEN_COOKIE_NAME,
            value=token,
            httponly=True,
            secure=False
            if self.settings.env in [Environment.DEV, Environment.TEST]
            else True,
            samesite="lax"
            if self.settings.env in [Environment.DEV, Environment.TEST]
            else "strict",
            max_age=timedelta(
                days=self.settings.refresh_token_expire_days
            ).total_seconds(),
        )

    async def create_refresh_token(self, user_id: int) -> str:
        """Generate, hash, and store a new refresh token."""
        token_str = secrets.token_urlsafe(AppParameter.TOKEN_LENGTH)
        token_hash = self._hash_token(token_str)

        expires_at = datetime.now(timezone.utc) + timedelta(
            days=self.settings.refresh_token_expire_days
        )

        refresh_token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        await self.repository.create_refresh_token(refresh_token)
        return token_str

    async def login(
        self, username: str, password: str, response: Response
    ) -> AuthResponse:
        """Authenticate user and return access + refresh tokens."""
        user = await self.user_service.authenticate_user(username, password)

        await self.repository.delete_all_user_tokens(user.id)
        _logger.info("User logged in", extra={"user_id": user.id, "username": username})
        user_detail = UserDetail.model_validate(user)
        return await self._issue_tokens(user_detail, response)

    async def refresh_access_token(
        self, refresh_token: Optional[str], response: Response
    ) -> AuthResponse:
        """Validate refresh token and rotate it."""
        if not refresh_token:
            response.delete_cookie(AppParameter.REFRESH_TOKEN_COOKIE_NAME)
            raise AuthenticationException(
                params={"detail": "auth.refresh_token_missing"}
            )

        token_hash = self._hash_token(refresh_token)
        stored_token = await self.repository.get_refresh_token_by_hash(token_hash)

        if not stored_token:
            response.delete_cookie(AppParameter.REFRESH_TOKEN_COOKIE_NAME)
            raise AuthenticationException(
                params={"detail": "auth.refresh_token_invalid"}
            )

        expires_at = stored_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            await self.repository.revoke_refresh_token(stored_token.id)
            response.delete_cookie(AppParameter.REFRESH_TOKEN_COOKIE_NAME)
            raise AuthenticationException(
                params={"detail": "auth.refresh_token_invalid"}
            )

        # Revoke old token (Rotation)
        await self.repository.revoke_refresh_token(stored_token.id)

        # Get user to issue new tokens
        user = await self.user_service.get_user_internal(stored_token.user_id)

        return await self._issue_tokens(user, response)

    async def logout(self, refresh_token: Optional[str], response: Response) -> None:
        """Revoke the refresh token and clear cookie."""
        if refresh_token:
            token_hash = self._hash_token(refresh_token)
            stored_token = await self.repository.get_refresh_token_by_hash(token_hash)
            if stored_token:
                await self.repository.revoke_refresh_token(stored_token.id)
                _logger.info("User logged out", extra={"user_id": stored_token.user_id})

        response.delete_cookie(AppParameter.REFRESH_TOKEN_COOKIE_NAME)

    async def verify_email(self, token: str, response: Response) -> AuthResponse:
        """Verify user email and issue auth tokens."""
        user = await self.user_service.verify_user(token)
        if not user:
            raise AuthenticationException(params={"detail": "auth.verification_failed"})

        await self.repository.delete_all_user_tokens(user.id)
        _logger.info("Email verified", extra={"user_id": user.id})
        user_detail = UserDetail.model_validate(user)
        return await self._issue_tokens(user_detail, response)

    async def forgot_password(self, payload: ForgotPasswordRequest) -> None:
        """
        Initiate password reset: generate a token, store it, and email the user.
        Always returns silently even if the email does not exist (anti-enumeration).
        """
        user = await self.user_service.get_by_email(str(payload.email))
        if not user:
            return

        await self.repository.delete_user_reset_tokens(user.id)

        token_str = secrets.token_urlsafe(AppParameter.TOKEN_LENGTH)
        token_hash = self._hash_token(token_str)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=AppParameter.RESET_TOKEN_EXPIRE_MINUTES
        )
        reset_token = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        await self.repository.create_reset_token(reset_token)

        if self.settings.smtp_host:
            try:
                await self.email_service.send_password_reset_email(
                    str(payload.email), token_str
                )
            except EmailSendException as e:
                _logger.error(
                    "Password reset email failed to send",
                    extra={"user_id": user.id, "error": str(e)},
                )

        _logger.info("Password reset requested", extra={"user_id": user.id})

    async def reset_password(self, payload: ResetPasswordRequest) -> None:
        """Validate reset token and update user password."""
        token_hash = self._hash_token(payload.token)
        reset_token = await self.repository.get_reset_token_by_hash(token_hash)

        if not reset_token:
            raise AuthenticationException(key="auth.reset_token_invalid")

        expires_at = reset_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < datetime.now(timezone.utc):
            raise AuthenticationException(key="auth.reset_token_invalid")

        new_hashed_password = hash_password(payload.new_password)
        await self.user_service.update_password_internal(
            reset_token.user_id, new_hashed_password
        )
        await self.repository.mark_reset_token_used(reset_token.id)
        await self.repository.delete_all_user_tokens(reset_token.user_id)

        _logger.info("Password reset completed", extra={"user_id": reset_token.user_id})

    async def google_login(self, request: Request) -> dict:
        """Initiate Google OAuth flow."""
        return await self.google_auth_service.login(request)

    async def google_callback(
        self, request: Request, response: Response
    ) -> AuthResponse:
        """Handle Google OAuth callback."""
        user_info = await self.google_auth_service.callback(request)

        user = await self.user_service.get_or_create_google_user(user_info)
        _logger.info(
            "Google OAuth login",
            extra={"user_id": user.id, "email": user_info.get("email")},
        )

        return await self._issue_tokens(user, response)


# =============================================================================
# Dependencies
# =============================================================================

SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_auth_service(
    session: SessionDep, user_service: UserServiceDep, settings: SettingsDep
) -> AuthService:
    repo = AuthRepository(session, RefreshToken)
    email_service = EmailService(settings)
    google_auth_service = GoogleAuthService(settings)
    return AuthService(repo, user_service, email_service, google_auth_service, settings)


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
