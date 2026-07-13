import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from app.core.enums.postgresql_schema import PostgreSQLSchema
from app.modules.setup_root_user.models import RootUserSetupToken
from httpx import AsyncClient
from sqlalchemy import text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession


async def _remove_all_users(session: AsyncSession) -> None:
    """The default test seed always creates an admin; remove everyone (and the
    data that references them) to test the 'no administrator yet' branch."""
    await session.exec(
        text(
            f'TRUNCATE TABLE {PostgreSQLSchema.APP_DATA}.userteamlink, '
            f'{PostgreSQLSchema.APP_DATA}.atlasteamlink, {PostgreSQLSchema.APP_DATA}.atlas, '
            f'{PostgreSQLSchema.APP_DATA}.map, {PostgreSQLSchema.APP_DATA}.team, '
            f'{PostgreSQLSchema.APP_DATA}."user" RESTART IDENTITY CASCADE;'
        )
    )
    await session.commit()


async def _insert_setup_token(
    session: AsyncSession, raw_token: str, expires_in: timedelta
) -> None:
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    session.add(
        RootUserSetupToken(
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + expires_in,
        )
    )
    await session.commit()


@pytest.mark.asyncio
async def test_complete_setup_rejected_when_admin_exists(client: AsyncClient):
    """Test the setup endpoint refuses to run once an admin already exists (default seed)."""
    response = await client.post(
        "/setup/complete",
        json={
            "token": "irrelevant",
            "email": "new-admin@test.com",
            "username": "new_admin",
            "password": "a_strong_password123",
        },
    )
    assert response.status_code == 403
    assert response.json()["key"] == "setup_root_user.already_completed"


@pytest.mark.asyncio
async def test_complete_setup_invalid_token(client: AsyncClient, session: AsyncSession):
    """Test the setup endpoint rejects an unknown token when no admin exists."""
    await _remove_all_users(session)

    response = await client.post(
        "/setup/complete",
        json={
            "token": "not_a_real_token",
            "email": "new-admin@test.com",
            "username": "new_admin",
            "password": "a_strong_password123",
        },
    )
    assert response.status_code == 401
    assert response.json()["key"] == "setup_root_user.token_invalid"


@pytest.mark.asyncio
async def test_complete_setup_expired_token(client: AsyncClient, session: AsyncSession):
    """Test the setup endpoint rejects a token past its expiry."""
    await _remove_all_users(session)
    await _insert_setup_token(session, "expired_token", expires_in=timedelta(minutes=-1))

    response = await client.post(
        "/setup/complete",
        json={
            "token": "expired_token",
            "email": "new-admin@test.com",
            "username": "new_admin",
            "password": "a_strong_password123",
        },
    )
    assert response.status_code == 401
    assert response.json()["key"] == "setup_root_user.token_invalid"


@pytest.mark.asyncio
async def test_complete_setup_success(client: AsyncClient, session: AsyncSession):
    """Test a valid token creates the first administrator and is single-use."""
    await _remove_all_users(session)
    await _insert_setup_token(session, "valid_token", expires_in=timedelta(minutes=30))

    response = await client.post(
        "/setup/complete",
        json={
            "token": "valid_token",
            "email": "new-admin@test.com",
            "username": "new_admin",
            "password": "a_strong_password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "new-admin@test.com"
    assert "ADMIN" in data["roles"]

    # The token must not be reusable.
    result = await session.exec(select(RootUserSetupToken))
    assert result.first() is None

    retry = await client.post(
        "/setup/complete",
        json={
            "token": "valid_token",
            "email": "another@test.com",
            "username": "another_admin",
            "password": "a_strong_password123",
        },
    )
    assert retry.status_code == 403
    assert retry.json()["key"] == "setup_root_user.already_completed"
