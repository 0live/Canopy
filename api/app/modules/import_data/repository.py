from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession


class ImportDataRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_column_index(self, table_name: str, column_name: str) -> None:
        """Create a B-tree index on a user-selected attribute column."""
        index_name = f"idx_{table_name}_{column_name}"
        stmt = text(
            f'CREATE INDEX IF NOT EXISTS "{index_name}" '
            f'ON "{table_name}" ("{column_name}")'
        )
        await self._session.execute(stmt)
