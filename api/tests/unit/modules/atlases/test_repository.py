from unittest.mock import AsyncMock, Mock, MagicMock

import pytest

from app.modules.atlases.models import Atlas
from app.modules.atlases.repository import AtlasRepository


class TestAtlasRepository:
    @pytest.fixture
    def mock_session(self):
        return AsyncMock()

    @pytest.fixture
    def repository(self, mock_session):
        return AtlasRepository(session=mock_session, model=Atlas)

    # --- _build_query ---

    def test_build_query_admin_bypass_has_no_where(self, repository):
        """admin_bypass=True returns query without any WHERE clause."""
        query = repository._build_query(admin_bypass=True)
        assert "WHERE" not in str(query).upper()

    def test_build_query_admin_bypass_has_no_join(self, repository):
        """admin_bypass=True returns query without JOIN."""
        query = repository._build_query(admin_bypass=True)
        assert "JOIN" not in str(query).upper()

    def test_build_query_default_has_where(self, repository):
        """Without admin_bypass, query always includes a WHERE clause (PUBLIC condition)."""
        query = repository._build_query()
        assert "WHERE" in str(query).upper()

    def test_build_query_with_owner_filter_has_where(self, repository):
        """filter_owner_id adds a WHERE clause with created_by_id condition."""
        query = repository._build_query(filter_owner_id=5)
        sql = str(query).upper()
        assert "WHERE" in sql
        assert "CREATED_BY_ID" in sql

    def test_build_query_with_team_ids_has_join(self, repository):
        """filter_team_ids adds an outerjoin on AtlasTeamLink."""
        query = repository._build_query(filter_team_ids=[1, 2])
        assert "JOIN" in str(query).upper()

    def test_build_query_without_team_ids_has_no_join(self, repository):
        """Without filter_team_ids, no JOIN is added."""
        query = repository._build_query(filter_owner_id=1)
        assert "JOIN" not in str(query).upper()

    # --- count ---

    @pytest.mark.asyncio
    async def test_count_delegates_to_count_from_query(self, repository):
        """count() calls count_from_query with the result of _build_query."""
        mock_query = MagicMock()
        repository._build_query = Mock(return_value=mock_query)
        repository.count_from_query = AsyncMock(return_value=3)

        result = await repository.count(
            filter_owner_id=1, filter_team_ids=None, admin_bypass=False
        )

        assert result == 3
        repository._build_query.assert_called_once_with(1, None, False)
        repository.count_from_query.assert_awaited_once_with(mock_query)

    @pytest.mark.asyncio
    async def test_count_admin_bypass(self, repository):
        """count() passes admin_bypass=True to _build_query."""
        mock_query = MagicMock()
        repository._build_query = Mock(return_value=mock_query)
        repository.count_from_query = AsyncMock(return_value=10)

        result = await repository.count(admin_bypass=True)

        assert result == 10
        repository._build_query.assert_called_once_with(None, None, True)
