from unittest.mock import MagicMock

import pytest
from app.core.config import get_settings
from app.modules.db_access.repository import DbAccessRepository


class TestRoleNameValidation:
    """Tests for role name validation in DbAccessRepository."""

    def test_valid_role_names(self):
        repo = DbAccessRepository(MagicMock())

        # These should not raise
        repo._validate_role_name(f"{get_settings().db_role_prefix}1")
        repo._validate_role_name(f"{get_settings().db_role_prefix}42")
        repo._validate_role_name(f"{get_settings().db_role_prefix}12345")

    def test_invalid_role_names_raise_error(self):
        repo = DbAccessRepository(MagicMock())

        with pytest.raises(ValueError):
            repo._validate_role_name("admin")

        with pytest.raises(ValueError):
            repo._validate_role_name("user_")

        with pytest.raises(ValueError):
            repo._validate_role_name("user_abc")

        with pytest.raises(ValueError):
            repo._validate_role_name("user_1; DROP TABLE users;")

        with pytest.raises(ValueError):
            repo._validate_role_name("")
