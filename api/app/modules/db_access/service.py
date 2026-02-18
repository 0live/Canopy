from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends

from app.core.enums.app_parameter import AppParameter
from app.core.exceptions import (
    AuthenticationException,
    DbAccessException,
    PermissionDeniedException,
)
from app.core.messages import MessageService
from app.modules.db_access.repository import (
    DbAccessRepository,
    DbAccessRepositoryDep,
)
from app.modules.db_access.schemas import (
    DatabaseAccessStatus,
    DatabaseActivateResponse,
)
from app.modules.users.enums import UserRole
from app.modules.users.models import User


class DbAccessService:
    """Service for managing postgresql database access provisioning."""

    # Activation token validity duration
    TOKEN_VALIDITY_DURATION = timedelta(hours=8)

    def __init__(self, repository: DbAccessRepository):
        self.repository = repository

    @staticmethod
    def _get_role_name(user_id: int) -> str:
        """Generate PostgreSQL role name for a user."""
        return f"{AppParameter.DB_ROLE_PREFIX}{user_id}"

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
        self, password: str, current_user: User
    ) -> DatabaseActivateResponse:
        """
        Activate postgresql database access using activation token.
        """
        if UserRole.WITHDBACCESS not in current_user.roles:
            raise PermissionDeniedException(key="db_access.no_access")

        if not current_user.db_activation_token:
            raise AuthenticationException(key="db_access.invalid_token")

        if current_user.db_activation_token_created_at:
            created_at = current_user.db_activation_token_created_at
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            if now - created_at > self.TOKEN_VALIDITY_DURATION:
                raise DbAccessException(key="db_access.token_expired")

        role_name = self._get_role_name(current_user.id)

        if await self.repository.role_exists(role_name):
            raise DbAccessException(key="db_access.already_activated")

        try:
            await self.repository.create_role(role_name, password)
        except Exception as e:
            raise DbAccessException(key="db_access.role_creation_failed") from e

        await self.repository.update(
            current_user.id,
            {"db_activation_token": None, "db_activation_token_created_at": None},
        )

        return DatabaseActivateResponse(
            role_name=role_name,
            message=MessageService.get_message("db_access.activation_success"),
        )

    async def revoke_database_access(self, user_id: int) -> bool:
        """
        Revoke postgresql database access for a user by dropping the role.
        """
        role_name = self._get_role_name(user_id)
        try:
            return await self.repository.drop_role(role_name)
        except Exception as e:
            raise DbAccessException(key="db_access.role_revocation_failed") from e


def get_db_access_service(
    repository: DbAccessRepositoryDep,
) -> DbAccessService:
    return DbAccessService(repository)


DbAccessServiceDep = Annotated[DbAccessService, Depends(get_db_access_service)]
