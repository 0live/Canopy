from unittest.mock import MagicMock

import pytest
from app.modules.db_access.repository import DbAccessRepository


class TestDbAccessRepositorySecurity:
    """
    Security tests for DbAccessRepository ensuring safe SQL generation.
    """

    @pytest.mark.asyncio
    async def test_create_role_sql_generation(self):
        """
        Verify that create_role uses psycopg.sql to compose the query safely.
        """
        # Mock session
        mock_session = MagicMock()

        # Async mock setup for session.execute()
        async def execute_mock(statement, params=None):
            # return a mock result for select current_database
            mock_res = MagicMock()
            mock_res.scalar.return_value = "test_db"
            return mock_res

        mock_session.execute.side_effect = execute_mock

        repo = DbAccessRepository(mock_session)

        # Execute
        await repo.create_role("canopy_user_123", "secure'password")

        # Verify calls
        calls = mock_session.execute.call_args_list
        assert len(calls) >= 7

        def get_sql_from_call(call):
            return str(call[0][0])

        # 1. SELECT current_database()
        assert "SELECT current_database()" in get_sql_from_call(calls[0])

        # 2. CREATE ROLE
        create_role_sql = get_sql_from_call(calls[1])
        # With default quoting (UTF-8/Standard):
        # Identifiers quoted with double quotes
        # Strings quoted with single quotes, single quotes escaped as ''
        assert 'CREATE ROLE "canopy_user_123"' in create_role_sql
        assert "LOGIN PASSWORD 'secure''password'" in create_role_sql

        # 3. GRANT CONNECT
        grant_connect = get_sql_from_call(calls[2])
        assert (
            'GRANT CONNECT ON DATABASE "test_db" TO "canopy_user_123"' in grant_connect
        )

    @pytest.mark.asyncio
    async def test_drop_role_sql_generation(self):
        """
        Verify that drop_role uses psycopg.sql to compose the query safely.
        """
        mock_session = MagicMock()

        # Mock role_exists to return True
        async def execute_mock(statement, params=None):
            mock_res = MagicMock()
            stmt_str = str(statement)
            if "pg_roles" in stmt_str:
                mock_res.scalar.return_value = 1
            return mock_res

        mock_session.execute.side_effect = execute_mock

        repo = DbAccessRepository(mock_session)

        await repo.drop_role("canopy_user_123")

        calls = mock_session.execute.call_args_list

        reassign_sql = str(calls[1][0][0])
        assert 'REASSIGN OWNED BY "canopy_user_123" TO CURRENT_USER' in reassign_sql

        drop_owned_sql = str(calls[2][0][0])
        assert 'DROP OWNED BY "canopy_user_123"' in drop_owned_sql

        drop_role_sql = str(calls[3][0][0])
        assert 'DROP ROLE IF EXISTS "canopy_user_123"' in drop_role_sql
