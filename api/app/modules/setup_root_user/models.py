from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel

from app.core.enums.postgresql_schema import PostgreSQLSchema


class RootUserSetupToken(SQLModel, table=True):
    """
    One-time token allowing the first administrator (root user) account to be
    created. Stores a hash of the token; the raw token only ever appears in
    the setup URL printed to the operator's terminal by the bootstrap script.
    """

    __table_args__ = {"schema": PostgreSQLSchema.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    token_hash: str = Field(index=True)
    expires_at: datetime
