from typing import Annotated, Sequence

from fastapi import Depends
from psycopg import sql
from sqlalchemy import text

from app.core.database import SessionDep
from app.modules.layers.schemas import TableColumn


def _table(schema_name: str, table_name: str) -> sql.Identifier:
    return sql.Identifier(schema_name, table_name)


class LayerTableRepository:
    """
    DDL and maintenance on the data tables themselves (users_data).
    Identifiers always go through psycopg.sql composition, never string formatting.
    """

    def __init__(self, session: SessionDep):
        self.session = session

    async def _execute(self, statement: sql.Composable) -> None:
        conn = await self.session.connection()
        await conn.exec_driver_sql(statement.as_string(None))

    async def table_exists(self, schema_name: str, table_name: str) -> bool:
        """Any relation counts (table, view...): they share the same namespace"""
        result = await self.session.exec(
            text(
                "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
                "WHERE n.nspname = :schema_name AND c.relname = :table_name"
            ),
            params={"schema_name": schema_name, "table_name": table_name},
        )
        return result.scalar() is not None

    async def drop_table(self, schema_name: str, table_name: str) -> None:
        await self._execute(
            sql.SQL("DROP TABLE IF EXISTS {}").format(_table(schema_name, table_name))
        )

    async def set_owner(
        self, schema_name: str, table_name: str, role_name: str
    ) -> None:
        await self._execute(
            sql.SQL("ALTER TABLE {} OWNER TO {}").format(
                _table(schema_name, table_name), sql.Identifier(role_name)
            )
        )

    async def list_columns(
        self, schema_name: str, table_name: str
    ) -> list[TableColumn]:
        result = await self.session.exec(
            text(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_schema = :schema_name AND table_name = :table_name "
                "ORDER BY ordinal_position"
            ),
            params={"schema_name": schema_name, "table_name": table_name},
        )
        return [
            TableColumn(name=name, data_type=data_type) for name, data_type in result
        ]

    async def nullify_empty_strings(
        self, schema_name: str, table_name: str, columns: Sequence[str]
    ) -> None:
        """Turns "" into NULL in the given text columns, in a single pass"""
        if not columns:
            return
        identifiers = [sql.Identifier(column) for column in columns]
        assignments = sql.SQL(", ").join(
            sql.SQL("{} = NULLIF({}, '')").format(column, column)
            for column in identifiers
        )
        condition = sql.SQL(" OR ").join(
            sql.SQL("{} = ''").format(column) for column in identifiers
        )
        await self._execute(
            sql.SQL("UPDATE {} SET {} WHERE {}").format(
                _table(schema_name, table_name), assignments, condition
            )
        )

    async def convert_columns_to_text(
        self, schema_name: str, table_name: str, columns: Sequence[str]
    ) -> None:
        if not columns:
            return
        alterations = sql.SQL(", ").join(
            sql.SQL("ALTER COLUMN {} TYPE text USING {}::text").format(
                sql.Identifier(column), sql.Identifier(column)
            )
            for column in columns
        )
        await self._execute(
            sql.SQL("ALTER TABLE {} {}").format(
                _table(schema_name, table_name), alterations
            )
        )

    async def create_index(
        self, schema_name: str, table_name: str, column: str, index_name: str
    ) -> None:
        await self._execute(
            sql.SQL("CREATE INDEX {} ON {} ({})").format(
                sql.Identifier(index_name),
                _table(schema_name, table_name),
                sql.Identifier(column),
            )
        )

    async def analyze(self, schema_name: str, table_name: str) -> None:
        await self._execute(
            sql.SQL("ANALYZE {}").format(_table(schema_name, table_name))
        )

    async def count_rows(self, schema_name: str, table_name: str) -> int:
        conn = await self.session.connection()
        statement = sql.SQL("SELECT count(*) FROM {}").format(
            _table(schema_name, table_name)
        )
        result = await conn.exec_driver_sql(statement.as_string(None))
        return result.scalar_one()


def get_layer_table_repository(session: SessionDep) -> LayerTableRepository:
    return LayerTableRepository(session)


LayerTableRepositoryDep = Annotated[
    LayerTableRepository, Depends(get_layer_table_repository)
]
