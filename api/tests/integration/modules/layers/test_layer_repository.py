import pytest
from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.modules.layers.enums import LayerGeometryType, LayerStatus
from app.modules.layers.models import UserLayer
from app.modules.layers.repository import LayerRepository
from app.modules.users.models import User
from sqlalchemy.exc import IntegrityError
from sqlmodel import select


async def _user_id(session, username: str) -> int:
    result = await session.exec(select(User).where(User.username == username))
    return result.one().id


async def _add_layer(
    repository: LayerRepository,
    owner_id: int,
    table_name: str,
    status=LayerStatus.READY,
):
    layer = await repository.create(
        {
            "table_name": table_name,
            "owner_id": owner_id,
            "status": status,
            "original_filename": f"{table_name}.zip",
        }
    )
    await repository.session.flush()
    return layer


@pytest.fixture(name="repository")
def repository_fixture(session) -> LayerRepository:
    return LayerRepository(session)


class TestLayerRegistry:
    async def test_defaults_to_the_users_data_schema(self, session, repository):
        layer = await _add_layer(
            repository, await _user_id(session, "admin"), "communes"
        )
        assert layer.schema_name == PostgreSQLSchema.USERS_DATA
        assert layer.geometry_type is None

    async def test_stores_the_import_result(self, session, repository):
        layer = await _add_layer(
            repository, await _user_id(session, "admin"), "communes"
        )
        await repository.update(
            layer.id,
            {
                "geometry_type": LayerGeometryType.MULTIPOLYGON,
                "srid": 2154,
                "feature_count": 34945,
            },
        )
        stored = await repository.get_by_table(PostgreSQLSchema.USERS_DATA, "communes")
        assert (stored.geometry_type, stored.srid, stored.feature_count) == (
            LayerGeometryType.MULTIPOLYGON,
            2154,
            34945,
        )

    async def test_get_by_table_returns_none_when_unknown(self, repository):
        assert (
            await repository.get_by_table(PostgreSQLSchema.USERS_DATA, "missing")
            is None
        )

    async def test_lists_layers_of_one_owner(self, session, repository):
        admin_id = await _user_id(session, "admin")
        await _add_layer(repository, admin_id, "communes")
        await _add_layer(repository, admin_id, "routes")
        await _add_layer(repository, await _user_id(session, "editor"), "rivieres")

        layers = await repository.list_by_owner(admin_id)
        assert [layer.table_name for layer in layers] == ["communes", "routes"]

    async def test_lists_layers_by_status(self, session, repository):
        admin_id = await _user_id(session, "admin")
        await _add_layer(repository, admin_id, "queued", LayerStatus.QUEUED)
        await _add_layer(repository, admin_id, "importing", LayerStatus.IMPORTING)
        await _add_layer(repository, admin_id, "ready", LayerStatus.READY)

        layers = await repository.list_by_statuses(
            [LayerStatus.QUEUED, LayerStatus.IMPORTING]
        )
        assert [layer.table_name for layer in layers] == ["queued", "importing"]


class TestLayerRegistryConstraints:
    async def test_a_table_name_is_registered_once(self, session, repository):
        await _add_layer(repository, await _user_id(session, "admin"), "communes")
        with pytest.raises(IntegrityError):
            await _add_layer(repository, await _user_id(session, "editor"), "communes")

    async def test_a_user_owning_layers_cannot_be_deleted(self, session, repository):
        owner_id = await _user_id(session, "editor")
        await _add_layer(repository, owner_id, "communes")
        with pytest.raises(IntegrityError):
            await session.delete(await session.get(User, owner_id))
            await session.flush()


def test_model_is_registered_in_the_app_data_schema():
    assert UserLayer.__table__.schema == PostgreSQLSchema.APP_DATA
