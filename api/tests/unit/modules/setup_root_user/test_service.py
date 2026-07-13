from unittest.mock import AsyncMock, Mock

import pytest
from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.modules.setup_root_user.schemas import CompleteRootUserSetupRequest
from app.modules.setup_root_user.service import RootUserSetupService
from app.modules.users.enums import UserRole
from app.modules.users.schemas import UserDetail


class TestRootUserSetupService:
    @pytest.fixture
    def mock_repo(self):
        return AsyncMock()

    @pytest.fixture
    def mock_user_service(self):
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_repo, mock_user_service):
        return RootUserSetupService(repository=mock_repo, user_service=mock_user_service)

    @pytest.fixture
    def payload(self):
        return CompleteRootUserSetupRequest(
            token="raw_token",
            email="admin@canopy.dev",
            username="admin",
            password="a_strong_password123",
        )

    @pytest.mark.asyncio
    async def test_complete_setup_success(
        self, service, mock_repo, mock_user_service, payload
    ):
        """Test successful setup creates an admin and invalidates the token."""
        mock_user_service.admin_exists = AsyncMock(return_value=False)
        mock_repo.get_valid_token_by_hash = AsyncMock(return_value=Mock(id=1))
        created_admin = UserDetail(
            id=1,
            username="admin",
            email="admin@canopy.dev",
            roles=[UserRole.ADMIN],
            teams=[],
            is_verified=True,
        )
        mock_user_service.create_user = AsyncMock(return_value=created_admin)

        result = await service.complete_setup(payload)

        assert result.id == 1
        assert UserRole.ADMIN in result.roles
        mock_user_service.create_user.assert_called_once()
        _, kwargs = mock_user_service.create_user.call_args
        assert kwargs["force_roles"] == [UserRole.ADMIN]
        assert kwargs["is_verified"] is True
        mock_repo.delete_all_tokens.assert_called_once()

    @pytest.mark.asyncio
    async def test_complete_setup_admin_already_exists(
        self, service, mock_repo, mock_user_service, payload
    ):
        """Test setup is rejected once an administrator already exists."""
        mock_user_service.admin_exists = AsyncMock(return_value=True)

        with pytest.raises(PermissionDeniedException) as exc:
            await service.complete_setup(payload)

        assert exc.value.key == "setup_root_user.already_completed"
        mock_repo.get_valid_token_by_hash.assert_not_called()

    @pytest.mark.asyncio
    async def test_complete_setup_invalid_token(
        self, service, mock_repo, mock_user_service, payload
    ):
        """Test setup is rejected when the token is missing, wrong, or expired."""
        mock_user_service.admin_exists = AsyncMock(return_value=False)
        mock_repo.get_valid_token_by_hash = AsyncMock(return_value=None)

        with pytest.raises(AuthenticationException) as exc:
            await service.complete_setup(payload)

        assert exc.value.key == "setup_root_user.token_invalid"
        mock_user_service.create_user.assert_not_called()

    def test_hash_token_is_deterministic_and_not_reversible(self, service):
        """Test the token is hashed consistently (needed to look it up by hash)."""
        hashed_once = service._hash_token("raw_token")
        hashed_twice = service._hash_token("raw_token")

        assert hashed_once == hashed_twice
        assert hashed_once != "raw_token"
