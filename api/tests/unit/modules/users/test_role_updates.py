from unittest.mock import AsyncMock, Mock

import pytest
from app.core.exceptions import PermissionDeniedException
from app.modules.users.models import UserRole
from app.modules.users.schemas import UserDetail, UserRoleUpdate
from app.modules.users.service import UserService


class TestUserRoleUpdates:
    @pytest.fixture
    def mock_repo(self):
        repo = AsyncMock()
        repo.session = AsyncMock()
        return repo

    @pytest.fixture
    def mock_settings(self):
        return Mock()

    @pytest.fixture
    def mock_db_access_service(self):
        return AsyncMock()

    @pytest.fixture
    def mock_notification_service(self):
        return AsyncMock()

    @pytest.fixture
    def service(
        self,
        mock_repo,
        mock_settings,
        mock_db_access_service,
        mock_notification_service,
    ):
        return UserService(
            repository=mock_repo,
            settings=mock_settings,
            db_access_service=mock_db_access_service,
            notification_service=mock_notification_service,
        )

    @pytest.mark.asyncio
    async def test_update_user_roles_success(self, service, mock_repo):
        """Test successful role update by admin."""
        admin_user = UserDetail(
            id=99,
            username="admin",
            email="admin@test.com",
            roles=[UserRole.ADMIN],
            teams=[],
        )
        update_data = UserRoleUpdate(roles=[UserRole.ADMIN, UserRole.USER])

        # Mock get to return the updated user
        mock_repo.get = AsyncMock(
            return_value=UserDetail(
                id=1,
                username="target",
                email="target@test.com",
                roles=[UserRole.ADMIN, UserRole.USER],
                teams=[],
            )
        )

        result, activation_token = await service.update_user_roles(
            1, update_data, admin_user
        )

        assert UserRole.ADMIN in result.roles
        mock_repo.update.assert_awaited_once()
        # Verify the update data passed to repository
        call_args = mock_repo.update.call_args
        assert call_args[0][0] == 1  # user_id
        assert call_args[0][1] == {"roles": [UserRole.ADMIN, UserRole.USER]}

    @pytest.mark.asyncio
    async def test_update_user_roles_permission_denied(self, service):
        """Test role update denied for non-admin."""
        user = UserDetail(
            id=1,
            username="user",
            email="user@test.com",
            roles=[UserRole.USER],
            teams=[],
        )
        update_data = UserRoleUpdate(roles=[UserRole.ADMIN])

        with pytest.raises(PermissionDeniedException) as exc:
            await service.update_user_roles(2, update_data, user)

        assert exc.value.params["detail"] == "user.role_permission_denied"

    @pytest.mark.asyncio
    async def test_update_user_roles_self_denied(self, service):
        """Test user cannot update their own roles via this method if not admin."""
        user = UserDetail(
            id=1,
            username="user",
            email="user@test.com",
            roles=[UserRole.USER],
            teams=[],
        )
        update_data = UserRoleUpdate(roles=[UserRole.ADMIN])

        # Even for self, it should be denied if not admin
        with pytest.raises(PermissionDeniedException):
            await service.update_user_roles(1, update_data, user)
