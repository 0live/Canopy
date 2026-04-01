from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.core.notifications.enums import NotificationKey
from app.core.notifications.schemas import NotificationType

if TYPE_CHECKING:
    from app.modules.users.models import User


class Notification(SQLModel, table=True):
    __table_args__ = {"schema": PostgreSQLSchema.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key=f"{PostgreSQLSchema.APP_DATA}.user.id", index=True)
    type: NotificationType
    key: Optional[NotificationKey] = Field(default=None)
    payload: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    is_read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    user: "User" = Relationship(back_populates="notifications")
