import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends

from app.core.exceptions import (
    AuthenticationException,
    DbAccessException,
    PermissionDeniedException,
)
from app.modules.db_access.repository import (
    DbAccessRepository,
    DbAccessRepositoryDep,
)
from app.modules.db_access.schemas import (
    DatabaseAccessStatus,
    DatabaseActivateResponse,
)
from app.modules.users.models import User, UserRole

logger = logging.getLogger(__name__)


class DbAccessService:
    """Service for managing database access provisioning."""

    # Activation token validity duration
    TOKEN_VALIDITY_DURATION = timedelta(hours=8)

    def __init__(self, repository: DbAccessRepository):
        self.repository = repository

    @staticmethod
    def _get_role_name(user_id: int) -> str:
        """Generate PostgreSQL role name for a user."""
        return f"user_{user_id}"

    async def get_access_status(self, user: User) -> DatabaseAccessStatus:
        """Get database access status for a user."""
        has_access = UserRole.WITHDBACCESS in user.roles
        role_name = self._get_role_name(user.id) if has_access else None

        is_activated = False
        if has_access and role_name:
            is_activated = await self.repository.role_exists(role_name)

        return DatabaseAccessStatus(
            has_access=has_access,
            is_activated=is_activated,
            role_name=role_name if is_activated else None,
        )

    async def activate_database_access(
        self, token: str, password: str, current_user: User
    ) -> DatabaseActivateResponse:
        """
        Activate database access using activation token.

        Validates the token (existence & expiry) and verifies it belongs to current_user.
        """
        user = await self._get_valid_user_by_token(token)

        if user.id != current_user.id:
            raise PermissionDeniedException(key="db_access.token_mismatch")

        role_name = self._get_role_name(user.id)

        if await self.repository.role_exists(role_name):
            raise DbAccessException(key="db_access.already_activated")

        try:
            await self.repository.create_role(role_name, password)
        except Exception as e:
            logger.error(f"Failed to create role {role_name}: {e}")
            raise DbAccessException(key="db_access.role_creation_failed") from e

        # Clear token - using repository update
        await self.repository.update(
            user.id,
            {"db_activation_token": None, "db_activation_token_created_at": None},
        )

        return DatabaseActivateResponse(
            role_name=role_name,
            message="db_access.activation_success",
        )

    async def revoke_database_access(self, user_id: int) -> bool:
        """
        Revoke database access for a user.

        Drops the PostgreSQL role if it exists.
        Returns True if role was dropped.
        """
        role_name = self._get_role_name(user_id)
        return await self.repository.drop_role(role_name)

    async def _get_valid_user_by_token(self, token: str) -> User:
        """
        Find user by activation token and validate permissions & expiry.
        """
        user = await self.repository.get_by_activation_token(token)

        if not user:
            raise AuthenticationException(key="db_access.invalid_token")

        if UserRole.WITHDBACCESS not in user.roles:
            raise PermissionDeniedException(key="db_access.no_access")

        if user.db_activation_token_created_at:
            created_at = user.db_activation_token_created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            if now - created_at > self.TOKEN_VALIDITY_DURATION:
                raise DbAccessException(key="db_access.token_expired")

        return user


# =============================================================================
# Dependencies
# =============================================================================


def get_db_access_service(
    repository: DbAccessRepositoryDep,
) -> DbAccessService:
    return DbAccessService(repository)


DbAccessServiceDep = Annotated[DbAccessService, Depends(get_db_access_service)]
