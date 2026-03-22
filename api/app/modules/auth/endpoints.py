from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.core.enums.app_parameter import AppParameter
from app.core.messages import MessageService
from app.core.rate_limit import limiter
from app.modules.auth.schemas import ForgotPasswordRequest, RegisterPayload, ResetPasswordRequest, Token
from app.modules.auth.services.auth_service import AuthServiceDep
from app.modules.users.schemas import UserDetail

authRouter = APIRouter(prefix="/auth", tags=["Auth"])


@authRouter.get("/captcha/challenge")
@limiter.limit("20/minute")
async def captcha_challenge(request: Request, service: AuthServiceDep):
    """Generate a new Altcha captcha challenge."""
    return service.get_captcha_challenge()


@authRouter.post("/register", response_model=UserDetail)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterPayload, service: AuthServiceDep):
    """Register a new user."""
    return await service.register(payload)


@authRouter.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: AuthServiceDep,
    response: Response,
):
    """Login with username and password."""
    return await service.login(form_data.username, form_data.password, response)


@authRouter.post("/refresh", response_model=Token)
async def refresh_token(
    service: AuthServiceDep,
    response: Response,
    refresh_token: Annotated[
        str | None, Cookie(alias=AppParameter.REFRESH_TOKEN_COOKIE_NAME)
    ] = None,
):
    """Refresh access token using http-only cookie."""
    return await service.refresh_access_token(refresh_token, response)


@authRouter.post("/logout")
async def logout(
    service: AuthServiceDep,
    response: Response,
    refresh_token: Annotated[
        str | None, Cookie(alias=AppParameter.REFRESH_TOKEN_COOKIE_NAME)
    ] = None,
):
    """Logout and revoke refresh token."""
    await service.logout(refresh_token, response)
    return {"message": MessageService.get_message("auth.logout_success")}


@authRouter.get("/verify", response_model=Token)
async def verify_email(token: str, service: AuthServiceDep, response: Response):
    """Verify user account via email token and issue auth tokens."""
    return await service.verify_email(token, response)


@authRouter.post("/forgot-password", status_code=200)
@limiter.limit("3/hour")
async def forgot_password(
    request: Request, payload: ForgotPasswordRequest, service: AuthServiceDep
):
    """Request a password reset link. Always returns 200 to prevent email enumeration."""
    await service.forgot_password(payload)
    return {"message": MessageService.get_message("auth.reset_email_sent")}


@authRouter.post("/reset-password", status_code=200)
@limiter.limit("5/hour")
async def reset_password(
    request: Request, payload: ResetPasswordRequest, service: AuthServiceDep
):
    """Reset user password using the token received by email."""
    await service.reset_password(payload)
    return {"message": MessageService.get_message("auth.reset_success")}


@authRouter.get("/google")
async def login_google(request: Request, service: AuthServiceDep):
    """Initiate Google OAuth login."""
    return await service.google_login(request)


@authRouter.get("/google/callback", response_model=Token)
async def google_callback(
    request: Request,
    service: AuthServiceDep,
    response: Response,
):
    """Handle Google OAuth callback."""
    """Handle Google OAuth callback."""
    return await service.google_callback(request, response)
