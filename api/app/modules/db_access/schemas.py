from pydantic import BaseModel, Field


class DatabaseActivateRequest(BaseModel):
    """Request to activate database access with token and password."""

    password: str = Field(..., min_length=12)


class DatabaseActivateResponse(BaseModel):
    """Response after successful database activation."""

    role_name: str
    message: str


class DatabaseAccessStatus(BaseModel):
    """Current database access status for a user."""

    has_access: bool
    is_activated: bool
    role_name: str | None = None
