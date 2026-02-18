import datetime
from typing import TYPE_CHECKING, List, Optional

from pydantic import EmailStr
from sqlalchemy import Enum as SAEnum
from sqlmodel import ARRAY, Column, Field, Relationship, SQLModel

from app.core.enums.postgresql_schemas import PostgreSQLSchemas
from app.modules.teams.models import Team, UserTeamLink

if TYPE_CHECKING:
    from app.core.notifications.models import Notification


from app.modules.users.enums import UserRole


class User(SQLModel, table=True):
    __table_args__ = {"schema": PostgreSQLSchemas.APP_DATA}
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: EmailStr = Field(unique=True, index=True)
    hashed_password: str
    is_verified: bool = Field(default=False)
    verification_token: Optional[str] = Field(default=None)
    db_activation_token: Optional[str] = Field(default=None)
    db_activation_token_created_at: Optional[datetime.datetime] = Field(default=None)
    roles: List[UserRole] = Field(
        sa_column=Column(ARRAY(SAEnum(UserRole, schema=PostgreSQLSchemas.APP_DATA)))
    )
    teams: List["Team"] = Relationship(
        back_populates="users",
        link_model=UserTeamLink,
        sa_relationship_kwargs={"passive_deletes": True},
    )
    notifications: List["Notification"] = Relationship(
        back_populates="user", sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
