from unittest.mock import AsyncMock, Mock, MagicMock

import pytest

from app.modules.teams.models import Team
from app.modules.teams.repository import TeamRepository


class TestTeamRepository:
    @pytest.fixture
    def mock_session(self):
        return AsyncMock()

    @pytest.fixture
    def repository(self, mock_session):
        return TeamRepository(session=mock_session, model=Team)

    @pytest.fixture
    def mock_user(self):
        user = Mock()
        user.id = 1
        return user

    # --- _build_query ---

    def test_build_query_no_filter_has_no_where(self, repository):
        """filter_by_access=False returns query without WHERE clause."""
        query = repository._build_query(user=None, filter_by_access=False)
        assert "WHERE" not in str(query).upper()

    def test_build_query_filter_without_user_has_no_where(self, repository):
        """filter_by_access=True but user=None returns query without WHERE clause."""
        query = repository._build_query(user=None, filter_by_access=True)
        assert "WHERE" not in str(query).upper()

    def test_build_query_filter_with_user_has_where(self, repository, mock_user):
        """filter_by_access=True with a user returns query with WHERE clause."""
        query = repository._build_query(user=mock_user, filter_by_access=True)
        assert "WHERE" in str(query).upper()

    def test_build_query_filter_with_user_has_join(self, repository, mock_user):
        """filter_by_access=True with a user adds an outerjoin on UserTeamLink."""
        query = repository._build_query(user=mock_user, filter_by_access=True)
        assert "JOIN" in str(query).upper()

    # --- count ---

    @pytest.mark.asyncio
    async def test_count_delegates_to_count_from_query(self, repository, mock_user):
        """count() calls count_from_query with the result of _build_query."""
        mock_query = MagicMock()
        repository._build_query = Mock(return_value=mock_query)
        repository.count_from_query = AsyncMock(return_value=5)

        result = await repository.count(user=mock_user, filter_by_access=True)

        assert result == 5
        repository._build_query.assert_called_once_with(mock_user, True)
        repository.count_from_query.assert_awaited_once_with(mock_query)

    @pytest.mark.asyncio
    async def test_count_default_args(self, repository):
        """count() works with default arguments."""
        mock_query = MagicMock()
        repository._build_query = Mock(return_value=mock_query)
        repository.count_from_query = AsyncMock(return_value=0)

        result = await repository.count()

        assert result == 0
        repository._build_query.assert_called_once_with(None, True)
