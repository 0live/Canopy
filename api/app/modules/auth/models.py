from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.enums.postgresql_schemas import PostgreSQLSchemas


class RefreshToken(SQLModel, table=True):
    """
    Refresh Token model for handling long-lived authentication sessions.
    Stores a hash of the token to prevent database leaks from compromising accounts.
    """

    __table_args__ = {"schema": PostgreSQLSchemas.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(
        foreign_key=f"{PostgreSQLSchemas.APP_DATA}.user.id", index=True
    )
    token_hash: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    revoked: bool = Field(default=False)
