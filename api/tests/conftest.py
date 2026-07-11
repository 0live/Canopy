import pytest
import pytest_asyncio
from app.core.config import Settings, get_settings
from app.core.database import get_session
from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.core.seeds import Seeder
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import pool, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession
from testcontainers.core.waiting_utils import wait_for_logs
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

POSTGRES_IMAGE = "postgres:16-alpine"
POSTGRES_USER = "tester"
POSTGRES_PASSWORD = "tester"
POSTGRES_DATABASE = "test_database"


@pytest.fixture(name="postgres_container", scope="session")
def postgres_container_fixture():
    """Starts the container once per session."""
    postgres = PostgresContainer(
        image=POSTGRES_IMAGE,
        username=POSTGRES_USER,
        password=POSTGRES_PASSWORD,
        dbname=POSTGRES_DATABASE,
    )
    with postgres:
        wait_for_logs(
            container=postgres,
            predicate="database system is ready to accept connections",
        )
        yield postgres


@pytest.fixture(name="redis_container", scope="session")
def redis_container_fixture():
    """Starts a Redis container once per session."""
    redis = RedisContainer("redis:7-alpine")
    with redis:
        yield redis


@pytest.fixture(name="settings", scope="session")
def settings_fixture(
    postgres_container: PostgresContainer, redis_container: RedisContainer
):
    """Provides test-specific settings to override environment variables."""
    import os

    from app.core.config import get_settings

    redis_url = f"redis://{redis_container.get_container_host_ip()}:{redis_container.get_exposed_port(6379)}/0"

    # Set env vars for direct usage (e.g. in non-dependency calls)
    os.environ["REDIS_URL"] = redis_url
    get_settings.cache_clear()

    settings = Settings(
        env="test",
        private_key="test_secret_key_very_long_for_jwt_requirements_123",
        postgres_user=POSTGRES_USER,
        postgres_password=POSTGRES_PASSWORD,
        postgres_db=POSTGRES_DATABASE,
        database_url=postgres_container.get_connection_url()
        .replace("postgresql+psycopg2://", "postgresql+psycopg://")
        .replace("postgresql://", "postgresql+psycopg://"),
        redis_url=redis_url,
        allow_self_registration=True,
    )
    return settings


@pytest.fixture(autouse=True)
def reset_singletons():
    """Reset singletons between tests."""
    from app.core.config import get_settings
    from app.core.notifications.service import NotificationService

    NotificationService._instance = None
    get_settings.cache_clear()
    yield
    NotificationService._instance = None
    get_settings.cache_clear()


@pytest_asyncio.fixture(name="engine", scope="session")
async def engine_fixture(settings: Settings):
    """Initializes the database schema once per session."""
    engine = create_async_engine(settings.database_url, poolclass=pool.NullPool)
    async with engine.begin() as conn:
        await conn.execute(
            text(f"CREATE SCHEMA IF NOT EXISTS {PostgreSQLSchema.APP_DATA}")
        )
        await conn.execute(
            text(f"CREATE SCHEMA IF NOT EXISTS {PostgreSQLSchema.USERS_DATA}")
        )
        await conn.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(name="session")
async def session_fixture(engine):
    """
    Wraps each test in a transaction.
    Seeds are run inside the transaction and rolled back after each test.
    """
    async with engine.connect() as connection:
        transaction = await connection.begin()

        # Enable nested transaction (SAVEPOINT)
        # This allows application code to call session.commit() which will only release the savepoint
        # The actual data is never permanently committed to the DB because we rollback the outer transaction
        nested = await connection.begin_nested()

        # Bind session to the connection to participate in the transaction
        session = AsyncSession(bind=connection, expire_on_commit=False)

        # Run seeds inside the transaction
        seeder = Seeder(session)
        # We can now allow commit=True in seeds because it will simply release the savepoint
        # causing the data to be visible within this transaction but not persisted
        await seeder.run(commit=True)

        yield session

        await session.close()
        # Rollback the outer transaction to clean up everything
        if nested.is_active:
            await nested.rollback()
        await transaction.rollback()


@pytest_asyncio.fixture(name="client")
async def client_fixture(session: AsyncSession, settings: Settings):
    """Configures AsyncClient with session and settings overrides."""
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_settings] = lambda: settings

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://localhost"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest.fixture(name="user_data")
def user_data_fixture():
    return {
        "email": "test@test.com",
        "username": "test_user",
        "password": "test_password",
        "altcha_payload": "dummy",
    }


@pytest.fixture(name="existing_users")
def existing_users_fixture():
    return [
        {"email": "baseUser@test.com", "username": "baseUser", "password": "baseUser"},
        {"email": "editor@test.com", "username": "editor", "password": "editor"},
        {"email": "admin@test.com", "username": "admin", "password": "admin"},
    ]


@pytest.fixture(name="auth_token_factory")
def token_factory_fixture(client: AsyncClient):
    """
    Helper fixture to generate a JWT token for protected routes.
    """

    async def _get_token(
        username: str = "test_user", password: str = "test_password"
    ) -> str:
        payload = {"username": username, "password": password}
        response = await client.post(
            "/auth/login",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 200
        return response.json()["access_token"]

    return _get_token


@pytest_asyncio.fixture(name="register_and_verify_user")
async def register_and_verify_user_fixture(client: AsyncClient, session: AsyncSession):
    """
    Helper fixture to register a user and immediately verify them.
    Returns a function that takes user_data dict and returns the user response.
    """
    from app.modules.users.models import User
    from sqlmodel import select

    async def _register_and_verify(user_data: dict) -> dict:
        # 1. Register via /auth/register
        if "altcha_payload" not in user_data:
            user_data["altcha_payload"] = "dummy"
        response = await client.post("/auth/register", json=user_data)
        assert response.status_code == 200
        user_response = response.json()

        # 2. Directly verify the user in the database
        stmt = select(User).where(User.email == user_data["email"])
        result = await session.exec(stmt)
        user = result.one()
        user.is_verified = True
        user.verification_token = None
        session.add(user)
        await session.commit()

        return user_response

    return _register_and_verify
