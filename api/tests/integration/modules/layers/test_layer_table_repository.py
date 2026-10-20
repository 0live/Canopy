import pytest
from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.modules.layers.naming_service import LayerNamingService
from app.modules.layers.schemas import TableColumn
from app.modules.layers.table_repository import LayerTableRepository
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

SCHEMA = PostgreSQLSchema.USERS_DATA
TABLE = "communes"


async def _sql(session, statement: str, **params):
    return await session.exec(text(statement), params=params)


@pytest.fixture(name="tables")
async def tables_fixture(session) -> LayerTableRepository:
    """A users_data table shaped like a GDAL import, rolled back with the test"""
    await _sql(
        session,
        f"CREATE TABLE {SCHEMA}.{TABLE} (fid serial PRIMARY KEY, nom varchar, "
        "code integer, extra json, geom geometry(MultiPolygon, 2154))",
    )
    await _sql(
        session,
        f"INSERT INTO {SCHEMA}.{TABLE} (nom, code, extra) VALUES "
        """('Paris', 75, '{"a": 1}'), ('', 13, NULL), (NULL, NULL, '[1, 2]')""",
    )
    return LayerTableRepository(session)


async def _column(session, column: str) -> list:
    result = await _sql(session, f"SELECT {column} FROM {SCHEMA}.{TABLE} ORDER BY fid")
    return [row[0] for row in result]


class TestTableLookup:
    async def test_finds_an_existing_table(self, tables):
        assert await tables.table_exists(SCHEMA, TABLE)

    async def test_misses_an_unknown_table(self, tables):
        assert not await tables.table_exists(SCHEMA, "unknown")

    async def test_counts_a_view_as_taken(self, session, tables):
        await _sql(session, f"CREATE VIEW {SCHEMA}.paris AS SELECT 1")
        assert await tables.table_exists(SCHEMA, "paris")

    async def test_lists_columns_in_order_with_their_type(self, tables):
        columns = await tables.list_columns(SCHEMA, TABLE)
        assert columns[:4] == [
            TableColumn(name="fid", data_type="integer"),
            TableColumn(name="nom", data_type="character varying"),
            TableColumn(name="code", data_type="integer"),
            TableColumn(name="extra", data_type="json"),
        ]
        assert columns[4].name == "geom"

    async def test_counts_rows(self, tables):
        assert await tables.count_rows(SCHEMA, TABLE) == 3


class TestTableLifecycle:
    async def test_drops_a_table(self, tables):
        await tables.drop_table(SCHEMA, TABLE)
        assert not await tables.table_exists(SCHEMA, TABLE)

    async def test_dropping_a_missing_table_is_a_no_op(self, tables):
        await tables.drop_table(SCHEMA, "unknown")

    async def test_quotes_identifiers(self, tables):
        await tables.drop_table(SCHEMA, f'{TABLE}"; DROP TABLE {SCHEMA}.{TABLE}; --')
        assert await tables.table_exists(SCHEMA, TABLE)

    async def test_gives_the_table_to_a_role(self, session, tables):
        await _sql(session, "CREATE ROLE canopy_user_999")
        await tables.set_owner(SCHEMA, TABLE, "canopy_user_999")
        result = await _sql(
            session,
            "SELECT tableowner FROM pg_tables WHERE schemaname = :s AND tablename = :t",
            s=SCHEMA,
            t=TABLE,
        )
        assert result.scalar() == "canopy_user_999"

    async def test_analyze_records_the_row_estimate(self, session, tables):
        await tables.analyze(SCHEMA, TABLE)
        result = await _sql(
            session,
            "SELECT reltuples FROM pg_class WHERE oid = :t ::regclass",
            t=f"{SCHEMA}.{TABLE}",
        )
        assert result.scalar() == 3


class TestColumnCleanup:
    async def test_turns_empty_strings_into_null(self, session, tables):
        await tables.nullify_empty_strings(SCHEMA, TABLE, ["nom"])
        assert await _column(session, "nom") == ["Paris", None, None]

    async def test_cleanup_without_text_columns_is_a_no_op(self, session, tables):
        await tables.nullify_empty_strings(SCHEMA, TABLE, [])
        assert await _column(session, "nom") == ["Paris", "", None]

    async def test_converts_json_columns_to_text(self, session, tables):
        await tables.convert_columns_to_text(SCHEMA, TABLE, ["extra"])
        columns = {
            column.name: column.data_type
            for column in await tables.list_columns(SCHEMA, TABLE)
        }
        assert columns["extra"] == "text"
        assert await _column(session, "extra") == ['{"a": 1}', None, "[1, 2]"]


class TestIndexes:
    async def test_creates_a_btree_index(self, session, tables):
        name = LayerNamingService().index_name(TABLE, "nom")
        await tables.create_index(SCHEMA, TABLE, "nom", name)
        result = await _sql(
            session,
            "SELECT indexdef FROM pg_indexes WHERE schemaname = :s AND indexname = :n",
            s=SCHEMA,
            n=name,
        )
        assert "USING btree (nom)" in result.scalar()

    async def test_raises_when_a_value_is_too_large_for_a_btree(self, session, tables):
        # Random text does not compress, so it stays above the ~2.7 KB B-tree entry limit
        await _sql(
            session,
            f"UPDATE {SCHEMA}.{TABLE} SET nom = (SELECT string_agg(md5(random()::text), '') "
            "FROM generate_series(1, 200)) WHERE code = 75",
        )
        with pytest.raises(DBAPIError):
            await tables.create_index(
                SCHEMA, TABLE, "nom", LayerNamingService().index_name(TABLE, "nom")
            )
