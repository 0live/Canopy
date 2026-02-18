import secrets
from datetime import datetime, timezone
from typing import Annotated, Any, Optional

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from app.core.config import Settings, get_settings
from app.core.database import SessionDep
from app.core.enums.app_parameter import AppParameter
from app.core.exceptions import (
    AuthenticationException,
    DuplicateEntityException,
    EntityNotFoundException,
    PermissionDeniedException,
)
from app.core.hashing import hash_password, verify_password
from app.core.messages import MessageService
from app.core.notifications.schemas import NotificationMessage, NotificationType
from app.core.notifications.service import NotificationService, NotificationServiceDep
from app.core.permissions import has_any_role
from app.modules.db_access.service import DbAccessService, DbAccessServiceDep
from app.modules.teams.models import Team
from app.modules.users.enums import UserRole
from app.modules.users.models import User
from app.modules.users.repository import UserRepository
from app.modules.users.schemas import (
    UserCreate,
    UserDetail,
    UserInternalUpdate,
    UserRoleUpdate,
    UserSummary,
    UserUpdate,
)


class UserService:
    """Service for user CRUD operations (not authentication)."""

    def __init__(
        self,
        repository: UserRepository,
        settings: Settings,
        db_access_service: DbAccessService,
        notification_service: NotificationService,
    ):
        self.repository = repository
        self.settings = settings
        self.db_access_service = db_access_service
        self.notification_service = notification_service

    async def get_all_users(self, current_user: UserDetail) -> list[UserSummary]:
        if not has_any_role(current_user, [UserRole.ADMIN]):
            raise PermissionDeniedException(
                params={"detail": "user.list_permission_denied"}
            )
        return await self.repository.get_all()

    async def get_user_by_id(
        self, user_id: int, current_user: UserDetail
    ) -> UserDetail:
        if (
            not has_any_role(current_user, [UserRole.ADMIN])
            and current_user.id != user_id
        ):
            raise PermissionDeniedException(
                params={"detail": "user.read_permission_denied"}
            )

        return await self.repository.get_or_raise(
            user_id,
            "User",
            "user.not_found",
            options=[selectinload(User.teams)],
        )

    async def get_user_internal(self, user_id: int) -> UserDetail:
        """
        Get user by ID without permission checks.
        Internal use only (e.g. AuthService, system tasks).
        """
        return await self.repository.get_or_raise(
            user_id,
            "User",
            "user.not_found",
            options=[selectinload(User.teams)],
        )

    async def get_by_username(
        self, username: str, with_relations: bool = False
    ) -> Optional[User]:
        options = []
        if with_relations:
            options = [selectinload(User.teams).selectinload(Team.users)]
        return await self.repository.get_by_username(username, options=options)

    async def get_by_email(self, email: str) -> Optional[User]:
        return await self.repository.get_by_email(email)

    async def create_user(
        self,
        user: UserCreate,
        is_verified: bool = False,
        verification_token: Optional[str] = None,
        force_roles: Optional[list[UserRole]] = None,
    ) -> UserDetail:
        """
        Create a new user with validated credentials.
        """
        await self.repository.validate_unique_credentials(user.email, user.username)
        user_data = self._prepare_user_creation_data(
            user, is_verified, verification_token, force_roles
        )
        new_user = await self.repository.create(user_data)
        await self.repository.session.flush()
        await self.repository.session.refresh(new_user)

        return await self.repository.get(
            new_user.id, options=[selectinload(User.teams)]
        )

    async def create_user_by_admin(
        self, user: UserCreate, current_user: UserDetail
    ) -> UserDetail:
        """Create a user directly (Admin only). User is automatically verified."""
        if not has_any_role(current_user, [UserRole.ADMIN]):
            raise PermissionDeniedException(
                params={"detail": "user.create_permission_denied"}
            )

        return await self.create_user(user, is_verified=True, force_roles=user.roles)

    async def get_or_create_google_user(self, user_info: dict) -> UserDetail:
        """Get existing user by email or create a new one for Google OAuth."""
        email = user_info.get("email")
        existing_user = await self.get_by_email(email)

        if existing_user:
            return UserDetail.model_validate(existing_user)

        username = user_info.get("name") or email.split("@")[0]
        user_create = UserCreate(
            email=email,
            username=username,
            password=secrets.token_urlsafe(AppParameter.MIN_PASSWORD_LENGTH),
        )
        return await self.create_user(user_create, is_verified=True)

    def _prepare_user_creation_data(
        self,
        user: UserCreate,
        is_verified: bool,
        verification_token: Optional[str],
        force_roles: Optional[list[UserRole]] = None,
    ) -> dict[str, Any]:
        hashed_pw = hash_password(user.password)
        user_data = user.model_dump(exclude={"password", "roles", "teams"})
        user_data["hashed_password"] = hashed_pw
        user_data["roles"] = force_roles if force_roles else [UserRole.USER]
        user_data["is_verified"] = is_verified

        if verification_token:
            user_data["verification_token"] = verification_token
        return user_data

    async def verify_user(self, token: str) -> bool:
        """Verify a user account using the token."""
        user = await self.repository.get_by_verification_token(token)
        if not user:
            return False

        user.is_verified = True
        user.verification_token = None
        await self.repository.session.flush()

        return True

    async def authenticate_user(self, username: str, password: str) -> Optional[User]:
        """Authenticate a user and return the user object."""
        user = await self.repository.get_by_username(
            username, options=[selectinload(User.teams)]
        )

        if user and verify_password(password, user.hashed_password):
            return user
        raise AuthenticationException()

    async def delete_user(
        self, user_id: int, current_user: UserDetail
    ) -> dict[str, str]:
        if not has_any_role(current_user, [UserRole.ADMIN]):
            raise PermissionDeniedException(
                params={"detail": "user.delete_permission_denied"}
            )

        user = await self.repository.get(user_id)
        if not user:
            raise EntityNotFoundException(
                entity="User", key="user.not_found", params={"id": user_id}
            )

        # Clean up PostgreSQL role if user had database access
        if UserRole.WITHDBACCESS in user.roles:
            await self.db_access_service.revoke_database_access(user_id)

        await self.repository.delete(user_id)

        return {"message": MessageService.get_message("user.deleted_success")}

    async def update_user(
        self, user_id: int, user_update: UserUpdate, current_user: UserDetail
    ) -> UserDetail:
        self._ensure_update_permissions(user_id, current_user)
        update_data = self._prepare_update_data(user_update, current_user)

        try:
            await self.repository.update(
                user_id, update_data, options=[selectinload(User.teams)]
            )
            await self.repository.session.flush()
        except IntegrityError as e:
            await self._handle_update_integrity_error(e, user_update)

        return await self.repository.get(user_id, options=[selectinload(User.teams)])

    async def update_user_roles(
        self, user_id: int, role_update: UserRoleUpdate, current_user: UserDetail
    ) -> UserDetail:
        """Update user roles."""
        if not has_any_role(current_user, [UserRole.ADMIN]):
            raise PermissionDeniedException(
                params={"detail": "user.role_permission_denied"}
            )

        user = await self.repository.get(user_id)
        if not user:
            raise EntityNotFoundException(
                entity="User", key="user.not_found", params={"id": user_id}
            )

        old_roles = set(user.roles) if user.roles else set()
        new_roles = set(role_update.roles)

        update_data = UserInternalUpdate(roles=role_update.roles)
        activation_token: Optional[str] = None

        # Handle WITHDBACCESS grant: generate activation token
        if (
            UserRole.WITHDBACCESS in new_roles
            and UserRole.WITHDBACCESS not in old_roles
        ):
            activation_token = secrets.token_urlsafe(AppParameter.TOKEN_LENGTH)
            update_data.db_activation_token = activation_token
            update_data.db_activation_token_created_at = datetime.now(timezone.utc)

        # Handle WITHDBACCESS revocation: clean up PostgreSQL role
        if (
            UserRole.WITHDBACCESS in old_roles
            and UserRole.WITHDBACCESS not in new_roles
        ):
            await self.db_access_service.revoke_database_access(user_id)
            update_data.db_activation_token = None
            update_data.db_activation_token_created_at = None

        await self.repository.update(
            user_id,
            update_data.model_dump(exclude_unset=True),
            options=[selectinload(User.teams)],
        )

        result_user = await self.repository.get(
            user_id, options=[selectinload(User.teams)]
        )

        # Send notification
        await self.notification_service.send_to_user(
            user_id,
            NotificationMessage(
                type=NotificationType.INFO,
                payload={
                    "old_roles": [r.value for r in old_roles],
                    "new_roles": [r.value for r in new_roles],
                },
            ),
        )

        return result_user

    def _ensure_update_permissions(self, user_id: int, current_user: UserDetail):
        if user_id != current_user.id and not has_any_role(
            current_user, [UserRole.ADMIN]
        ):
            raise PermissionDeniedException(
                params={"detail": "user.update_permission_denied"}
            )

    def _prepare_update_data(
        self, user_update: UserUpdate, current_user: UserDetail
    ) -> dict[str, Any]:
        update_data = user_update.model_dump(exclude_unset=True, exclude={"password"})

        if user_update.password is not None:
            update_data["hashed_password"] = hash_password(user_update.password)

        return update_data

    async def _handle_update_integrity_error(
        self, e: IntegrityError, user_update: UserUpdate
    ):
        error_msg = str(e)
        if "user_username" in error_msg:
            raise DuplicateEntityException(
                key="user.username_exists",
                params={"username": user_update.username},
            )
        if "user_email" in error_msg:
            raise DuplicateEntityException(
                key="user.email_exists", params={"email": user_update.email}
            )
        raise e


# =============================================================================
# Dependencies
# =============================================================================

SettingsDep = Annotated[Settings, Depends(get_settings)]


async def get_user_service(
    session: SessionDep,
    settings: SettingsDep,
    db_access_service: DbAccessServiceDep,
    notification_service: NotificationServiceDep,
) -> UserService:
    repo = UserRepository(session, User)
    return UserService(
        repo,
        settings,
        db_access_service=db_access_service,
        notification_service=notification_service,
    )


UserServiceDep = Annotated[UserService, Depends(get_user_service)]
