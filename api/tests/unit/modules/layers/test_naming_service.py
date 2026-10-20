import pytest

from app.modules.layers.constants import PostgresLimit
from app.modules.layers.naming_service import LayerNamingService


@pytest.fixture
def naming() -> LayerNamingService:
    return LayerNamingService()


class TestIndexName:
    def test_keeps_short_names_readable(self, naming):
        assert naming.index_name("communes", "code_insee") == "idx_communes_code_insee"

    def test_shortens_long_names_to_the_identifier_limit(self, naming):
        name = naming.index_name("t" * 60, "c" * 60)
        assert len(name) == PostgresLimit.IDENTIFIER_MAX_LENGTH
        assert name.startswith("idx_ttt")

    def test_long_names_sharing_a_prefix_stay_distinct(self, naming):
        table = "t" * 60
        assert naming.index_name(table, "column_a") != naming.index_name(
            table, "column_b"
        )

    def test_is_stable(self, naming):
        assert naming.index_name("t" * 60, "c" * 60) == naming.index_name(
            "t" * 60, "c" * 60
        )
