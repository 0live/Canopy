from datetime import datetime, timezone
from typing import Optional

from app.core.enums.postgresql_schemas import PostgreSQLSchemas
from sqlalchemy import DateTime, func
from sqlmodel import Field, SQLModel


class AuditMixin(SQLModel):
    created_by_id: Optional[int] = Field(
        default=None, foreign_key=f"{PostgreSQLSchemas.APP_DATA}.user.id"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={"server_default": func.now(), "nullable": False},
    )
    updated_at: Optional[datetime] = Field(
        default=None,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "onupdate": func.now(),
            "server_default": func.now(),
            "nullable": False,
        },
    )
    updated_by_id: Optional[int] = Field(
        default=None, foreign_key=f"{PostgreSQLSchemas.APP_DATA}.user.id"
    )

    @classmethod
    def add_audit_info(cls, data: dict, user_id: int):
        now = datetime.now(timezone.utc)
        data["updated_at"] = now
        data["updated_by_id"] = user_id
        if "created_at" not in data:
            data["created_at"] = now
        if "created_by_id" not in data:
            data["created_by_id"] = user_id
        return data
