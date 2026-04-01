from unittest.mock import AsyncMock, MagicMock, Mock

import pytest
from app.core.exceptions import PermissionDeniedException
from app.modules.users.models import User, UserRole
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

        result = await service.update_user_roles(1, update_data, admin_user)

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
            username="baseUser",
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
            username="baseUser",
            email="baseUser@test.com",
            roles=[UserRole.USER],
            teams=[],
        )
        update_data = UserRoleUpdate(roles=[UserRole.ADMIN])

        # Even for self, it should be denied if not admin
        with pytest.raises(PermissionDeniedException):
            await service.update_user_roles(1, update_data, user)

    @pytest.mark.asyncio
    async def test_withdbaccess_grant_stores_hash_not_plaintext(
        self, service, mock_repo, mock_notification_service
    ):
        """Verify that granting WITHDBACCESS stores a hash, never the plaintext token."""
        admin_user = UserDetail(
            id=99,
            username="admin",
            email="admin@test.com",
            roles=[UserRole.ADMIN],
            teams=[],
        )
        target_user = MagicMock(spec=User)
        target_user.id = 1
        target_user.roles = [UserRole.USER]

        mock_repo.get = AsyncMock(
            side_effect=[
                target_user,
                UserDetail(
                    id=1,
                    username="target",
                    email="target@test.com",
                    roles=[UserRole.USER, UserRole.WITHDBACCESS],
                    teams=[],
                ),
            ]
        )

        await service.update_user_roles(
            1, UserRoleUpdate(roles=[UserRole.USER, UserRole.WITHDBACCESS]), admin_user
        )

        call_args = mock_repo.update.call_args
        persisted_data = call_args[0][1]

        # Hash must be stored, not plaintext
        assert "db_activation_token" in persisted_data
        stored_value = persisted_data["db_activation_token"]
        assert stored_value is not None
        # SHA-256 hex digest is always 64 chars
        assert len(stored_value) == 64
        # Crucially, plaintext must NOT be stored
        assert "db_activation_token" not in persisted_data

        # Token must NOT be sent to anyone via notification
        for call in mock_notification_service.send_to_user.call_args_list:
            payload = call[0][1].payload
            assert "token" not in payload
