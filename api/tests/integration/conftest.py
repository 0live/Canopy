from unittest.mock import AsyncMock, patch

import pytest
from app.core.rate_limit import limiter


@pytest.fixture(autouse=True)
def disable_rate_limiting():
    """Disable rate limiting during integration tests."""
    original_enabled = limiter.enabled
    limiter.enabled = False
    yield
    limiter.enabled = original_enabled


@pytest.fixture(autouse=True)
def mock_postgres_role_repository():
    """
    Mock PostgresRoleRepository to avoid issues with TestContainers.
    The test PostgreSQL container doesn't have the users_data and postgis schemas.
    """
    with (
        patch(
            "app.modules.db_access.repository.DbAccessRepository.role_exists",
            new_callable=AsyncMock,
            return_value=False,
        ),
        patch(
            "app.modules.db_access.repository.DbAccessRepository.create_role",
            new_callable=AsyncMock,
        ),
        patch(
            "app.modules.db_access.repository.DbAccessRepository.drop_role",
            new_callable=AsyncMock,
            return_value=True,
        ),
    ):
        yield


@pytest.fixture(autouse=True)
def mock_email_service():
    """Mock EmailService to avoid actual SMTP connections during integration tests."""
    with patch(
        "app.modules.auth.services.email_service.EmailService.send_verification_email",
        new_callable=AsyncMock,
    ) as mock:
        yield mock
