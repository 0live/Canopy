from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.core.config import get_settings
from app.modules.db_access.repository import DbAccessRepository


class TestDbAccessRepositorySecurity:
    """
    Security tests for DbAccessRepository ensuring safe SQL generation.
    """

    @pytest.fixture
    def role_name(self):
        return f"{get_settings().db_role_prefix}123"

    @pytest.fixture
    def mock_session(self):
        session = MagicMock()

        async def execute_mock(statement, params=None):
            mock_res = MagicMock()
            mock_res.scalar.return_value = "test_db"
            return mock_res

        session.exec.side_effect = execute_mock

        mock_conn = MagicMock()
        mock_conn.exec_driver_sql = AsyncMock()
        session.connection = AsyncMock(return_value=mock_conn)

        return session

    @pytest.mark.asyncio
    async def test_create_role_sql_generation(self, role_name, mock_session):
        """
        Verify that create_role uses psycopg.sql to compose the query safely.
        """
        repo = DbAccessRepository(mock_session)
        await repo.create_role(role_name, "secure'password")

        # session.exec: only SELECT current_database()
        assert "SELECT current_database()" in str(
            mock_session.exec.call_args_list[0][0][0]
        )

        # exec_driver_sql: 7 DDL statements
        ddl_calls = mock_session.connection.return_value.exec_driver_sql.call_args_list
        assert len(ddl_calls) == 7

        create_role_sql = ddl_calls[0][0][0]
        assert f'CREATE ROLE "{role_name}"' in create_role_sql
        assert "LOGIN PASSWORD 'SCRAM-SHA-256$" in create_role_sql
        assert "secure" not in create_role_sql  # plaintext must never appear in SQL

        grant_connect = ddl_calls[1][0][0]
        assert f'GRANT CONNECT ON DATABASE "test_db" TO "{role_name}"' in grant_connect

    @pytest.mark.asyncio
    async def test_drop_role_sql_generation(self, role_name):
        """
        Verify that drop_role uses psycopg.sql to compose the query safely.
        """
        mock_session = MagicMock()

        async def execute_mock(statement, params=None):
            mock_res = MagicMock()
            stmt_str = str(statement)
            if "pg_roles" in stmt_str:
                mock_res.scalar.return_value = 1
            return mock_res

        mock_session.exec.side_effect = execute_mock

        repo = DbAccessRepository(mock_session)
        await repo.drop_role(role_name)

        calls = mock_session.exec.call_args_list

        reassign_sql = str(calls[1][0][0])
        assert f'REASSIGN OWNED BY "{role_name}" TO CURRENT_USER' in reassign_sql

        drop_owned_sql = str(calls[2][0][0])
        assert f'DROP OWNED BY "{role_name}"' in drop_owned_sql

        drop_role_sql = str(calls[3][0][0])
        assert f'DROP ROLE IF EXISTS "{role_name}"' in drop_role_sql

    @pytest.mark.asyncio
    async def test_update_role_password_uses_scram_verifier(
        self, role_name, mock_session
    ):
        """Verify that update_role_password emits a SCRAM verifier, not plaintext."""
        repo = DbAccessRepository(mock_session)
        await repo.update_role_password(role_name, "myplainpassword")

        ddl_calls = mock_session.connection.return_value.exec_driver_sql.call_args_list
        assert len(ddl_calls) == 1
        alter_sql = ddl_calls[0][0][0]
        assert f'ALTER ROLE "{role_name}"' in alter_sql
        assert "WITH PASSWORD 'SCRAM-SHA-256$" in alter_sql
        assert "myplainpassword" not in alter_sql

    @pytest.mark.asyncio
    async def test_create_role_calls_scram_verifier(self, role_name, mock_session):
        """Regression: repository must call generate_scram_sha256_verifier and not embed plaintext."""
        repo = DbAccessRepository(mock_session)
        with patch(
            "app.modules.db_access.repository.generate_scram_sha256_verifier",
            return_value="SCRAM-SHA-256$4096:abc$def:ghi",
        ) as mock_scram:
            await repo.create_role(role_name, "plain_password")

        mock_scram.assert_called_once_with("plain_password")
        create_sql = (
            mock_session.connection.return_value.exec_driver_sql.call_args_list[0][0][0]
        )
        assert "plain_password" not in create_sql
        assert "SCRAM-SHA-256" in create_sql
