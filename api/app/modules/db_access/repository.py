import logging
import re
from typing import Annotated, Optional

from fastapi import Depends
from sqlalchemy import text
from sqlmodel import select

from app.core.database import SessionDep
from app.core.repository import BaseRepository
from app.modules.users.models import User

logger = logging.getLogger(__name__)


class DbAccessRepository(BaseRepository[User]):
    """
    Repository for database access management.
    Handles PostgreSQL role operations and User activation token queries.
    """

    # Valid identifier pattern for PostgreSQL role names
    ROLE_NAME_PATTERN = re.compile(r"^user_\d+$")

    def __init__(self, session: SessionDep):
        super().__init__(session, User)

    def _validate_role_name(self, role_name: str) -> None:
        """Validate role name format to prevent injection."""
        if not self.ROLE_NAME_PATTERN.match(role_name):
            raise ValueError(f"Invalid role name format: {role_name}")

    async def get_by_activation_token(self, token: str) -> Optional[User]:
        """Find user by db_activation_token."""
        # Querying User model directly via inherited session
        query = select(User).where(User.db_activation_token == token)
        result = await self.session.exec(query)
        return result.first()

    async def role_exists(self, role_name: str) -> bool:
        """Check if a PostgreSQL role exists."""
        self._validate_role_name(role_name)

        # Use session to execute raw SQL
        result = await self.session.execute(
            text("SELECT 1 FROM pg_roles WHERE rolname = :role_name"),
            {"role_name": role_name},
        )
        return result.scalar() is not None

    async def create_role(self, role_name: str, password: str) -> None:
        """
        Create a new PostgreSQL role with restricted permissions.
        Executed within the current session transaction.
        """
        self._validate_role_name(role_name)

        # Use session to execute the DO block
        await self.session.execute(
            text(
                """
                DO $$
                DECLARE
                    db_name TEXT := current_database();
                BEGIN
                    -- Create role with login
                    EXECUTE format(
                        'CREATE ROLE %I LOGIN PASSWORD %L',
                        :role_name,
                        :password
                    );

                    -- Grant connect on database
                    EXECUTE format(
                        'GRANT CONNECT ON DATABASE %I TO %I',
                        db_name,
                        :role_name
                    );

                    -- Grant schema access
                    EXECUTE format(
                        'GRANT USAGE ON SCHEMA users_data TO %I',
                        :role_name
                    );

                    EXECUTE format(
                        'GRANT USAGE ON SCHEMA postgis TO %I',
                        :role_name
                    );
                    EXECUTE format(
                        'GRANT SELECT ON ALL TABLES IN SCHEMA postgis TO %I',
                        :role_name
                    );
                END $$;
                """
            ),
            {"role_name": role_name, "password": password},
        )

        logger.info(f"Created PostgreSQL role: {role_name}")

    async def drop_role(self, role_name: str) -> bool:
        """
        Drop a PostgreSQL role, handling owned objects.
        Returns True if role was dropped, False if it didn't exist.
        """
        self._validate_role_name(role_name)

        if not await self.role_exists(role_name):
            logger.info(f"Role {role_name} does not exist, nothing to drop")
            return False

        await self.session.execute(
            text(
                """
                DO $$
                BEGIN
                    -- Reassign owned objects to system user (current_user)
                    -- This ensures user-created tables/views are not lost
                    EXECUTE format('REASSIGN OWNED BY %I TO CURRENT_USER', :role_name);

                    -- Drop any remaining privs (DROP OWNED also revokes privileges granted TO the role)
                    EXECUTE format('DROP OWNED BY %I', :role_name);

                    -- Drop the role
                    EXECUTE format('DROP ROLE IF EXISTS %I', :role_name);
                END $$;
                """
            ),
            {"role_name": role_name},
        )

        logger.info(f"Dropped PostgreSQL role: {role_name}")
        return True


# =============================================================================
# Dependencies
# =============================================================================


def get_db_access_repository(
    session: SessionDep,
) -> DbAccessRepository:
    return DbAccessRepository(session)


DbAccessRepositoryDep = Annotated[DbAccessRepository, Depends(get_db_access_repository)]
