from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.enums.postgresql_schema import PostgreSQLSchema


class PasswordResetToken(SQLModel, table=True):
    """
    Password Reset Token model.
    Stores a hash of the token to prevent database leaks from compromising accounts.
    Token is single-use and expires after RESET_TOKEN_EXPIRE_MINUTES minutes.
    """

    __table_args__ = {"schema": PostgreSQLSchema.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key=f"{PostgreSQLSchema.APP_DATA}.user.id", index=True)
    token_hash: str = Field(index=True)
    expires_at: datetime
    used: bool = Field(default=False)


class RefreshToken(SQLModel, table=True):
    """
    Refresh Token model for handling long-lived authentication sessions.
    Stores a hash of the token to prevent database leaks from compromising accounts.
    """

    __table_args__ = {"schema": PostgreSQLSchema.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key=f"{PostgreSQLSchema.APP_DATA}.user.id", index=True)
    token_hash: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    revoked: bool = Field(default=False)
