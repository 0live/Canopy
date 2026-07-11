"""Integration tests exercising real PostgreSQL role DDL for db_access provisioning.

Unlike test_db_access.py, these tests opt out of the `mock_postgres_role_repository`
autouse mock (via the `real_db_roles` marker, see tests/integration/conftest.py) to
validate the actual CREATE ROLE / GRANT / DROP ROLE statements against a live
PostgreSQL instance, and the resulting privilege scope.
"""

import pytest
from app.modules.users.models import User
from httpx import AsyncClient
from sqlalchemy import text

pytestmark = pytest.mark.real_db_roles

ACCOUNT_PASSWORD = "provisioning_account_pw"
ACTIVATION_PASSWORD = "provisioning_activation_pw"


async def _admin_token(auth_token_factory, existing_users) -> str:
    admin_data = existing_users[2]
    return await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )


async def _create_user_with_db_access(
    client: AsyncClient, admin_token: str, username: str, email: str
) -> int:
    """Create a user and grant WITHDBACCESS. Returns the user id."""
    create_response = await client.post(
        "/users",
        json={"email": email, "username": username, "password": ACCOUNT_PASSWORD},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 200
    user_id = create_response.json()["id"]

    grant_response = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER", "WITHDBACCESS"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert grant_response.status_code == 200
    return user_id


async def _login(client: AsyncClient, username: str) -> str:
    login_res = await client.post(
        "/auth/login",
        data={"username": username, "password": ACCOUNT_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_res.status_code == 200
    return login_res.json()["access_token"]


async def _activate(client: AsyncClient, user_token: str) -> str:
    """Activate database access and return the created role name."""
    response = await client.post(
        "/database-access/activate",
        json={"password": ACTIVATION_PASSWORD},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    return response.json()["role_name"]


async def _create_and_activate_user(
    client: AsyncClient, admin_token: str, username: str, email: str
) -> tuple[int, str, str]:
    """Full setup: create user, grant access, log in, activate. Returns (id, role, token)."""
    user_id = await _create_user_with_db_access(client, admin_token, username, email)
    user_token = await _login(client, username)
    role_name = await _activate(client, user_token)
    return user_id, role_name, user_token


async def _role_can_login(session, role_name: str) -> bool | None:
    """Returns None if the role doesn't exist, else its rolcanlogin flag."""
    result = await session.execute(
        text("SELECT rolcanlogin FROM pg_roles WHERE rolname = :role_name"),
        {"role_name": role_name},
    )
    return result.scalar()


@pytest.mark.asyncio
async def test_activation_creates_login_role_in_postgres(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Activating database access must create a real, loginable PostgreSQL role."""
    admin_token = await _admin_token(auth_token_factory, existing_users)
    _, role_name, _ = await _create_and_activate_user(
        client, admin_token, "prov_nominal", "prov_nominal@test.com"
    )

    assert await _role_can_login(session, role_name) is True


@pytest.mark.asyncio
async def test_activated_role_is_confined_to_expected_schemas(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """The activated role must reach users_data/public but never app_data."""
    admin_token = await _admin_token(auth_token_factory, existing_users)
    _, role_name, _ = await _create_and_activate_user(
        client, admin_token, "prov_scope", "prov_scope@test.com"
    )

    async def has_usage(schema: str) -> bool:
        result = await session.execute(
            text("SELECT has_schema_privilege(:role, :schema, 'USAGE')"),
            {"role": role_name, "schema": schema},
        )
        return result.scalar()

    assert await has_usage("users_data") is True
    assert await has_usage("public") is True
    assert await has_usage("app_data") is False


@pytest.mark.asyncio
async def test_double_activation_is_rejected(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Reactivating an already-created role must fail without duplicating it."""
    admin_token = await _admin_token(auth_token_factory, existing_users)
    user_id, _, user_token = await _create_and_activate_user(
        client, admin_token, "prov_double", "prov_double@test.com"
    )

    # Simulate a desynced state where an activation token still exists even
    # though the PostgreSQL role was already created (e.g. race condition).
    user = await session.get(User, user_id)
    user.db_activation_token = "fake_hash_for_test"
    session.add(user)
    await session.commit()

    response = await client.post(
        "/database-access/activate",
        json={"password": ACTIVATION_PASSWORD},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_password_rotation_requires_activated_role(
    client: AsyncClient, auth_token_factory, existing_users
):
    """Password rotation succeeds once activated, fails otherwise."""
    admin_token = await _admin_token(auth_token_factory, existing_users)

    await _create_user_with_db_access(
        client, admin_token, "prov_pending", "prov_pending@test.com"
    )
    pending_token = await _login(client, "prov_pending")
    pending_response = await client.patch(
        "/database-access/password",
        json={"password": "another_secure_pw"},
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert pending_response.status_code == 400

    _, _, active_token = await _create_and_activate_user(
        client, admin_token, "prov_active", "prov_active@test.com"
    )
    active_response = await client.patch(
        "/database-access/password",
        json={"password": "another_secure_pw"},
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert active_response.status_code == 200


@pytest.mark.asyncio
async def test_revocation_drops_the_postgres_role(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Removing WITHDBACCESS must actually drop the PostgreSQL role."""
    admin_token = await _admin_token(auth_token_factory, existing_users)
    user_id, role_name, _ = await _create_and_activate_user(
        client, admin_token, "prov_revoke", "prov_revoke@test.com"
    )

    revoke_response = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert revoke_response.status_code == 200

    assert await _role_can_login(session, role_name) is None
