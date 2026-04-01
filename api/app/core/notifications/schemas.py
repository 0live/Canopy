from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class NotificationType(str, Enum):
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"


class NotificationMessage(BaseModel):
    model_config = ConfigDict(frozen=True)
    type: NotificationType
    key: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, frozen=True)
    id: int
    type: NotificationType
    key: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    is_read: bool
    created_at: datetime


class BulkDeleteRequest(BaseModel):
    notification_ids: List[int]
