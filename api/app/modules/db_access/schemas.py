from pydantic import BaseModel, ConfigDict, Field

from app.core.enums.app_parameter import AppParameter


class DatabaseActivateRequest(BaseModel):
    """Request to activate database access with token and password."""

    model_config = ConfigDict(frozen=True)

    password: str = Field(..., min_length=AppParameter.MIN_PASSWORD_LENGTH)


class DatabaseActivateResponse(BaseModel):
    """Response after successful database activation."""

    model_config = ConfigDict(frozen=True)

    role_name: str
    message: str


class DatabaseAccessStatus(BaseModel):
    """Current database access status for a user."""

    model_config = ConfigDict(frozen=True)

    has_access: bool
    is_activated: bool
    role_name: str | None = None
