from app.core.enums.access_policy import AccessPolicy
from app.core.enums.postgresql_schemas import PostgreSQLSchemas
from sqlalchemy import Enum as SAEnum
from sqlalchemy import text
from sqlmodel import Field, SQLModel


class AccessPolicyMixin(SQLModel):
    access_policy: AccessPolicy = Field(
        sa_type=SAEnum(
            AccessPolicy,
            name="accesspolicy",
            schema=PostgreSQLSchemas.APP_DATA,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        sa_column_kwargs={"server_default": text("'standard'")},
        nullable=False,
        default=AccessPolicy.STANDARD,
    )
