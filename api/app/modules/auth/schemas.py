from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    model_config = ConfigDict(frozen=True)
    access_token: str
    token_type: str


class AuthResponse(Token):
    refresh_token: str
