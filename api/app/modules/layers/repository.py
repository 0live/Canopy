from typing import Annotated, Iterable, Optional

from fastapi import Depends
from sqlmodel import select

from app.core.database import SessionDep
from app.core.repository import BaseRepository
from app.modules.layers.enums import LayerStatus
from app.modules.layers.models import UserLayer


class LayerRepository(BaseRepository[UserLayer]):
    """Registry of user layers (app_data.user_layer)"""

    def __init__(self, session: SessionDep):
        super().__init__(session, UserLayer)

    async def get_by_table(
        self, schema_name: str, table_name: str
    ) -> Optional[UserLayer]:
        query = select(UserLayer).where(
            UserLayer.schema_name == schema_name, UserLayer.table_name == table_name
        )
        result = await self.session.exec(query)
        return result.first()

    async def list_by_owner(self, owner_id: int) -> list[UserLayer]:
        query = select(UserLayer).where(UserLayer.owner_id == owner_id)
        result = await self.session.exec(query.order_by(UserLayer.id))
        return list(result.all())

    async def list_by_statuses(
        self, statuses: Iterable[LayerStatus]
    ) -> list[UserLayer]:
        query = select(UserLayer).where(UserLayer.status.in_(list(statuses)))
        result = await self.session.exec(query.order_by(UserLayer.id))
        return list(result.all())


def get_layer_repository(session: SessionDep) -> LayerRepository:
    return LayerRepository(session)


LayerRepositoryDep = Annotated[LayerRepository, Depends(get_layer_repository)]
