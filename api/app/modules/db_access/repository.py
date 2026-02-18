import re
from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy import text
from sqlmodel import select

from app.core.database import SessionDep
from app.core.enums.app_parameter import AppParameter
from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.core.repository import BaseRepository
from app.modules.users.models import User


class DbAccessRepository(BaseRepository[User]):
    """
    Repository for database access management.
    Handles PostgreSQL role operations and User activation token queries.
    """

    ROLE_NAME_PATTERN = re.compile(rf"^{re.escape(AppParameter.DB_ROLE_PREFIX)}\d+$")

    def __init__(self, session: SessionDep):
        super().__init__(session, User)

    def _validate_role_name(self, role_name: str) -> None:
        if not self.ROLE_NAME_PATTERN.match(role_name):
            raise ValueError(f"Invalid role name format: {role_name}")

    async def get_by_activation_token(self, token: str) -> Optional[User]:
        query = select(User).where(User.db_activation_token == token)
        result = await self.session.exec(query)
        return result.first()

    async def role_exists(self, role_name: str) -> bool:
        self._validate_role_name(role_name)

        result = await self.session.execute(
            text("SELECT 1 FROM pg_roles WHERE rolname = :role_name"),
            {"role_name": role_name},
        )
        return result.scalar() is not None

    def _escape_sql_string(self, value: str) -> str:
        return value.replace("'", "''")

    async def create_role(self, role_name: str, password: str) -> None:
        self._validate_role_name(role_name)
        escaped_password = self._escape_sql_string(password)

        result = await self.session.execute(text("SELECT current_database()"))
        db_name = result.scalar()

        await self.session.execute(
            text(f"CREATE ROLE {role_name} LOGIN PASSWORD '{escaped_password}'")
        )
        await self.session.execute(
            text(f"GRANT CONNECT ON DATABASE {db_name} TO {role_name}")
        )
        await self.session.execute(
            text(f"GRANT USAGE ON SCHEMA {PostgreSQLSchema.USERS_DATA} TO {role_name}")
        )
        await self.session.execute(
            text(f"GRANT CREATE ON SCHEMA {PostgreSQLSchema.USERS_DATA} TO {role_name}")
        )
        await self.session.execute(
            text(f"GRANT USAGE ON SCHEMA {PostgreSQLSchema.PUBLIC} TO {role_name}")
        )
        await self.session.execute(
            text(
                f"GRANT SELECT ON ALL TABLES IN SCHEMA {PostgreSQLSchema.PUBLIC} TO {role_name}"
            )
        )

    async def drop_role(self, role_name: str) -> bool:
        self._validate_role_name(role_name)

        if not await self.role_exists(role_name):
            return False

        await self.session.execute(
            text(f"REASSIGN OWNED BY {role_name} TO CURRENT_USER")
        )
        await self.session.execute(text(f"DROP OWNED BY {role_name}"))
        await self.session.execute(text(f"DROP ROLE IF EXISTS {role_name}"))

        return True


# =============================================================================
# Dependencies
# =============================================================================


def get_db_access_repository(
    session: SessionDep,
) -> DbAccessRepository:
    return DbAccessRepository(session)


DbAccessRepositoryDep = Annotated[DbAccessRepository, Depends(get_db_access_repository)]
