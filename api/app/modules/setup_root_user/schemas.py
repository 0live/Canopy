from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.password_validation import validate_password


class CompleteRootUserSetupRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    token: str
    email: EmailStr
    username: str = Field(min_length=5, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str

    @field_validator("password")
    @classmethod
    def valid_password(cls, v: str) -> str:
        return validate_password(v)
