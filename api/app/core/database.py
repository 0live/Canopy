from typing import Annotated, AsyncGenerator
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession


class DatabaseSessionManager:
    def __init__(self):
        self.engine: AsyncEngine | None = None

    def init(self, host: str, echo: bool = False):
        connect_args = {}
        # Handle prepare_threshold separately for pgbouncer compatibility with psycopg
        if "prepare_threshold" in host:
            parsed = urlparse(host)
            query_params = parse_qsl(parsed.query)
            new_params = []
            for key, value in query_params:
                if key == "prepare_threshold":
                    try:
                        connect_args["prepare_threshold"] = int(value)
                    except ValueError:
                        pass
                else:
                    new_params.append((key, value))

            new_query = urlencode(new_params)
            parsed = parsed._replace(query=new_query)
            host = urlunparse(parsed)

        self.engine = create_async_engine(
            host, echo=echo, future=True, connect_args=connect_args
        )

    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        if self.engine is None:
            raise Exception("DatabaseSessionManager is not initialized")

        async with AsyncSession(self.engine, expire_on_commit=False) as session:
            yield session

    async def close(self):
        if self.engine is None:
            raise Exception("DatabaseSessionManager is not initialized")
        await self.engine.dispose()


sessionmanager = DatabaseSessionManager()


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in sessionmanager.get_session():
        yield session


def get_engine() -> AsyncEngine:
    if sessionmanager.engine is None:
        raise Exception("DatabaseSessionManager is not initialized")
    return sessionmanager.engine


SessionDep = Annotated[AsyncSession, Depends(get_session)]
