import re
from typing import Annotated, Optional

from fastapi import Depends
from psycopg import sql
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

    async def create_role(self, role_name: str, password: str) -> None:
        """
        Create a PostgreSQL role safely using psycopg.sql composition.
        """
        self._validate_role_name(role_name)

        # Use default context (None) for string composition.
        # This uses UTF-8 and standard quoting, which is safe and sufficient here.
        context = None

        result = await self.session.execute(text("SELECT current_database()"))
        db_name = result.scalar()

        # Compose SQL safely
        create_role_query = (
            sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}")
            .format(sql.Identifier(role_name), sql.Literal(password))
            .as_string(context)
        )

        grant_connect = (
            sql.SQL("GRANT CONNECT ON DATABASE {} TO {}")
            .format(sql.Identifier(db_name), sql.Identifier(role_name))
            .as_string(context)
        )

        grant_usage_users = (
            sql.SQL("GRANT USAGE ON SCHEMA {} TO {}")
            .format(
                sql.Identifier(PostgreSQLSchema.USERS_DATA), sql.Identifier(role_name)
            )
            .as_string(context)
        )

        grant_create_users = (
            sql.SQL("GRANT CREATE ON SCHEMA {} TO {}")
            .format(
                sql.Identifier(PostgreSQLSchema.USERS_DATA), sql.Identifier(role_name)
            )
            .as_string(context)
        )

        grant_usage_public = (
            sql.SQL("GRANT USAGE ON SCHEMA {} TO {}")
            .format(sql.Identifier(PostgreSQLSchema.PUBLIC), sql.Identifier(role_name))
            .as_string(context)
        )

        grant_select_public = (
            sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA {} TO {}")
            .format(sql.Identifier(PostgreSQLSchema.PUBLIC), sql.Identifier(role_name))
            .as_string(context)
        )

        # Execute composed strings as text()
        await self.session.execute(text(create_role_query))
        await self.session.execute(text(grant_connect))
        await self.session.execute(text(grant_usage_users))
        await self.session.execute(text(grant_create_users))
        await self.session.execute(text(grant_usage_public))
        await self.session.execute(text(grant_select_public))

    async def drop_role(self, role_name: str) -> bool:
        self._validate_role_name(role_name)

        if not await self.role_exists(role_name):
            return False

        context = None

        reassign_query = (
            sql.SQL("REASSIGN OWNED BY {} TO CURRENT_USER")
            .format(sql.Identifier(role_name))
            .as_string(context)
        )

        drop_owned_query = (
            sql.SQL("DROP OWNED BY {}")
            .format(sql.Identifier(role_name))
            .as_string(context)
        )

        drop_role_query = (
            sql.SQL("DROP ROLE IF EXISTS {}")
            .format(sql.Identifier(role_name))
            .as_string(context)
        )

        await self.session.execute(text(reassign_query))
        await self.session.execute(text(drop_owned_query))
        await self.session.execute(text(drop_role_query))

        return True


# =============================================================================
# Dependencies
# =============================================================================


def get_db_access_repository(
    session: SessionDep,
) -> DbAccessRepository:
    return DbAccessRepository(session)


DbAccessRepositoryDep = Annotated[DbAccessRepository, Depends(get_db_access_repository)]
