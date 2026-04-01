from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.config import get_settings
from app.core.exceptions import (
    AuthenticationException,
    DbAccessException,
    PermissionDeniedException,
)
from app.modules.db_access.service import DbAccessService
from app.modules.users.models import User, UserRole


class TestGetRoleName:
    """Tests for DbAccessService._get_role_name static method."""

    def test_get_role_name_formats_correctly(self):
        assert DbAccessService._get_role_name(1) == f"{get_settings().db_role_prefix}1"
        assert DbAccessService._get_role_name(42) == f"{get_settings().db_role_prefix}42"
        assert (
            DbAccessService._get_role_name(12345)
            == f"{get_settings().db_role_prefix}12345"
        )


class TestGetAccessStatus:
    """Tests for DbAccessService.get_access_status."""

    @pytest.fixture
    def mock_repository(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_repository):
        return DbAccessService(mock_repository)

    @pytest.mark.asyncio
    async def test_no_access_when_role_not_present(self, service):
        user = MagicMock(spec=User)
        user.id = 1
        user.roles = [UserRole.USER]

        status = await service.get_access_status(user)

        assert status.has_access is False
        assert status.is_activated is False
        assert status.role_name is None

    @pytest.mark.asyncio
    async def test_has_access_not_activated(self, service, mock_repository):
        user = MagicMock(spec=User)
        user.id = 1
        user.roles = [UserRole.USER, UserRole.WITHDBACCESS]
        mock_repository.role_exists = AsyncMock(return_value=False)

        status = await service.get_access_status(user)

        assert status.has_access is True
        assert status.is_activated is False
        assert status.role_name is None

    @pytest.mark.asyncio
    async def test_has_access_activated(self, service, mock_repository):
        user = MagicMock(spec=User)
        user.id = 42
        user.roles = [UserRole.USER, UserRole.WITHDBACCESS]
        mock_repository.role_exists = AsyncMock(return_value=True)

        status = await service.get_access_status(user)

        assert status.has_access is True
        assert status.is_activated is True
        assert status.role_name == f"{get_settings().db_role_prefix}42"


class TestActivateDatabaseAccess:
    """Tests for DbAccessService.activate_database_access."""

    @pytest.fixture
    def mock_repository(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_repository):
        return DbAccessService(mock_repository)

    @pytest.mark.asyncio
    async def test_invalid_token_raises_exception(self, service):
        current_user = MagicMock(spec=User)
        current_user.id = 99
        current_user.roles = [UserRole.WITHDBACCESS]
        current_user.db_activation_token = None  # No token hash

        with pytest.raises(AuthenticationException) as exc_info:
            await service.activate_database_access("securepassword", current_user)

        assert exc_info.value.key == "db_access.invalid_token"

    @pytest.mark.asyncio
    async def test_no_access_raises_exception(self, service):
        current_user = MagicMock(spec=User)
        current_user.id = 99
        current_user.roles = [UserRole.USER]  # Missing WITHDBACCESS

        with pytest.raises(PermissionDeniedException) as exc_info:
            await service.activate_database_access("securepassword", current_user)

        assert exc_info.value.key == "db_access.no_access"

    @pytest.mark.asyncio
    async def test_already_activated_raises_exception(self, service, mock_repository):
        current_user = MagicMock(spec=User)
        current_user.id = 1
        current_user.roles = [UserRole.WITHDBACCESS]
        current_user.db_activation_token = "a" * 64  # valid hash
        current_user.db_activation_token_created_at = None

        mock_repository.role_exists = AsyncMock(return_value=True)

        with pytest.raises(DbAccessException) as exc_info:
            await service.activate_database_access("securepassword", current_user)

        assert exc_info.value.key == "db_access.already_activated"

    @pytest.mark.asyncio
    async def test_successful_activation(self, service, mock_repository):
        current_user = MagicMock(spec=User)
        current_user.id = 42
        current_user.roles = [UserRole.WITHDBACCESS]
        current_user.db_activation_token = "a" * 64  # valid hash
        current_user.db_activation_token_created_at = None  # valid

        mock_repository.role_exists = AsyncMock(return_value=False)
        mock_repository.create_role = AsyncMock()
        mock_repository.update = AsyncMock()
        mock_repository.session = MagicMock()
        mock_repository.session.commit = AsyncMock()

        # Mock MessageService
        with patch(
            "app.modules.db_access.service.MessageService"
        ) as MockMessageService:
            MockMessageService.get_message.side_effect = lambda key: key
            result = await service.activate_database_access(
                "securepassword123", current_user
            )

        assert result.role_name == f"{get_settings().db_role_prefix}42"
        assert result.message == "db_access.activation_success"
        mock_repository.create_role.assert_called_once_with(
            f"{get_settings().db_role_prefix}42", "securepassword123"
        )
        mock_repository.update.assert_called_once()
        # Ensure we cleared token hash (never the plaintext)
        call_args = mock_repository.update.call_args
        assert call_args[0][0] == 42
        assert call_args[0][1]["db_activation_token"] is None


class TestRevokeDatabaseAccess:
    """Tests for DbAccessService.revoke_database_access."""

    @pytest.fixture
    def mock_repository(self):
        return MagicMock()

    @pytest.fixture
    def service(self, mock_repository):
        return DbAccessService(mock_repository)

    @pytest.mark.asyncio
    async def test_revoke_drops_role(self, service, mock_repository):
        mock_repository.drop_role = AsyncMock(return_value=True)

        result = await service.revoke_database_access(42)

        assert result is True
        mock_repository.drop_role.assert_called_once_with(
            f"{get_settings().db_role_prefix}42"
        )

    @pytest.mark.asyncio
    async def test_revoke_returns_false_if_role_not_exists(
        self, service, mock_repository
    ):
        mock_repository.drop_role = AsyncMock(return_value=False)

        result = await service.revoke_database_access(99)

        assert result is False
