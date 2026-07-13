import hashlib
from typing import Annotated

from fastapi import Depends

from app.core.database import SessionDep
from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.core.logging_config import get_logger
from app.modules.setup_root_user.models import RootUserSetupToken
from app.modules.setup_root_user.repository import RootUserSetupRepository
from app.modules.setup_root_user.schemas import CompleteRootUserSetupRequest
from app.modules.users.enums import UserRole
from app.modules.users.schemas import UserCreate, UserDetail
from app.modules.users.service import UserService, UserServiceDep

_logger = get_logger("setup_root_user")


class RootUserSetupService:
    """Service handling the one-time first-admin (root user) bootstrap flow."""

    def __init__(self, repository: RootUserSetupRepository, user_service: UserService):
        self.repository = repository
        self.user_service = user_service

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    async def complete_setup(
        self, payload: CompleteRootUserSetupRequest
    ) -> UserDetail:
        """Validate the one-time token and create the first administrator account."""
        if await self.user_service.admin_exists():
            raise PermissionDeniedException(key="setup_root_user.already_completed")

        token_hash = self._hash_token(payload.token)
        setup_token = await self.repository.get_valid_token_by_hash(token_hash)
        if not setup_token:
            raise AuthenticationException(key="setup_root_user.token_invalid")

        user = UserCreate(
            email=payload.email, username=payload.username, password=payload.password
        )
        admin = await self.user_service.create_user(
            user, is_verified=True, force_roles=[UserRole.ADMIN]
        )
        await self.repository.delete_all_tokens()

        _logger.warning(
            "Initial administrator account created", extra={"user_id": admin.id}
        )
        return admin


# =============================================================================
# Dependencies
# =============================================================================


def get_root_user_setup_service(
    session: SessionDep, user_service: UserServiceDep
) -> RootUserSetupService:
    repo = RootUserSetupRepository(session, RootUserSetupToken)
    return RootUserSetupService(repo, user_service)


RootUserSetupServiceDep = Annotated[
    RootUserSetupService, Depends(get_root_user_setup_service)
]
