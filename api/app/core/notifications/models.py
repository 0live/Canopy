from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

from app.core.notifications.schemas import NotificationType

if TYPE_CHECKING:
    from app.modules.users.models import User


class Notification(SQLModel, table=True):
    __table_args__ = {"schema": "app_data"}
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="app_data.user.id", index=True)
    type: NotificationType
    payload: Dict[str, Any] = Field(default={}, sa_column=Column(JSONB))
    is_read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    user: "User" = Relationship(back_populates="notifications")
