from typing import Optional

from sqlalchemy import Column, ForeignKey, Integer
from sqlmodel import Field, SQLModel, UniqueConstraint

from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.core.mixins.audit_mixin import AuditMixin
from app.modules.layers.constants import PostgresLimit
from app.modules.layers.enums import LayerGeometryType, LayerStatus


class UserLayer(AuditMixin, SQLModel, table=True):
    """Registry entry of a geographic table owned by a user in users_data"""

    __tablename__ = "user_layer"
    __table_args__ = (
        UniqueConstraint(
            "schema_name", "table_name", name="uix_user_layer_schema_table"
        ),
        {"schema": PostgreSQLSchema.APP_DATA},
    )
    id: Optional[int] = Field(default=None, primary_key=True)
    schema_name: str = Field(
        default=PostgreSQLSchema.USERS_DATA,
        max_length=PostgresLimit.IDENTIFIER_MAX_LENGTH,
    )
    table_name: str = Field(max_length=PostgresLimit.IDENTIFIER_MAX_LENGTH)
    # RESTRICT: a user who still owns layers cannot be deleted
    owner_id: int = Field(
        sa_column=Column(
            Integer,
            ForeignKey(f"{PostgreSQLSchema.APP_DATA}.user.id", ondelete="RESTRICT"),
            nullable=False,
            index=True,
        )
    )
    status: LayerStatus = Field(index=True)
    original_filename: str
    # Known once GDAL has inspected and imported the file
    geometry_type: Optional[LayerGeometryType] = Field(default=None)
    srid: Optional[int] = Field(default=None)
    feature_count: Optional[int] = Field(default=None)
