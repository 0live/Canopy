from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.password_validation import validate_password
from app.modules.users.schemas import UserCreate


class Token(BaseModel):
    model_config = ConfigDict(frozen=True)
    access_token: str
    token_type: str


class AuthResponse(Token):
    refresh_token: str


class RegisterPayload(UserCreate):
    """Extends UserCreate with captcha for public self-registration."""

    altcha_payload: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        return validate_password(v)
