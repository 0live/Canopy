from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.password_validation import validate_password
from app.modules.teams.schemas import TeamSummary
from app.modules.users.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=5, pattern=r"^[a-zA-Z0-9_-]+$")
    roles: List[UserRole] = [UserRole.USER]
    model_config = ConfigDict(from_attributes=True, frozen=True)


class UserSummary(BaseModel):
    model_config = ConfigDict(frozen=True)
    id: int
    username: str


class AdminUserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, frozen=True)
    id: int
    username: str
    email: EmailStr
    roles: List[UserRole]
    is_verified: bool


class UserDetail(UserBase):
    id: int
    teams: List[TeamSummary] = []
    is_verified: bool = False
    postgis_role_created: bool = False


class UserDetailWithDbAccess(UserDetail):
    db_activation_token: Optional[str] = None
    db_activation_token_created_at: Optional[datetime] = None


class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        return validate_password(v)


class UserRoleUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)
    roles: List[UserRole]


class UserUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)
    email: Optional[EmailStr] = Field(default=None)
    username: Optional[str] = Field(
        default=None, min_length=5, pattern=r"^[a-zA-Z0-9_-]+$"
    )
    password: Optional[str] = Field(default=None)
    current_password: Optional[str] = Field(default=None)

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return validate_password(v)


class UserRoleUpdateResponse(BaseModel):
    """Response schema for role update — includes one-time plaintext token if DB access was granted."""

    model_config = ConfigDict(from_attributes=True, frozen=True)

    user: UserDetail
    db_activation_token: Optional[str] = None


class UserInternalUpdate(BaseModel):
    """Schema for internal user updates (system fields)."""

    model_config = ConfigDict(frozen=True)

    roles: Optional[List[UserRole]] = None
    db_activation_token: Optional[str] = None
    db_activation_token_created_at: Optional[datetime] = None
