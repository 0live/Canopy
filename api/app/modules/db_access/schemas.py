from pydantic import BaseModel, Field

from app.core.enums.app_parameters import AppParameters


class DatabaseActivateRequest(BaseModel):
    """Request to activate database access with token and password."""

    password: str = Field(..., min_length=AppParameters.MIN_PASSWORD_LENGTH)


class DatabaseActivateResponse(BaseModel):
    """Response after successful database activation."""

    role_name: str
    message: str


class DatabaseAccessStatus(BaseModel):
    """Current database access status for a user."""

    has_access: bool
    is_activated: bool
    role_name: str | None = None
