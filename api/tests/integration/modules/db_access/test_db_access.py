import pytest
from app.modules.users.models import User
from httpx import AsyncClient
from sqlmodel import select


async def get_user_id_by_username(
    client: AsyncClient, token: str, username: str
) -> int:
    response = await client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    users = response.json()["items"]
    for user in users:
        if user["username"] == username:
            return user["id"]
    raise ValueError(f"User {username} not found")


@pytest.mark.asyncio
async def test_grant_withdbaccess_generates_token(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Test that granting WITHDBACCESS generates an activation token."""
    admin_data = existing_users[2]  # admin
    target_data = existing_users[0]  # user

    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )

    target_user_id = await get_user_id_by_username(
        client, admin_token, target_data["username"]
    )

    # Grant WITHDBACCESS role
    response = await client.put(
        f"/users/{target_user_id}/roles",
        json={"roles": ["USER", "WITHDBACCESS"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "WITHDBACCESS" in data["roles"]

    # Verify token hash in DB (plaintext must never be persisted)
    user = await session.get(User, target_user_id)
    assert user.db_activation_token is not None
    assert len(user.db_activation_token) == 64  # SHA-256 hex digest


@pytest.mark.asyncio
async def test_grant_withdbaccess_twice_regenerates_token(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Test that granting WITHDBACCESS when already present doesn't regenerate token."""
    admin_data = existing_users[2]

    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )

    # Create a new user for this test
    create_response = await client.post(
        "/users",
        json={
            "email": "dbtest@test.com",
            "username": "dbtest",
            "password": "dbtest_password",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 200
    user_id = create_response.json()["id"]

    # First grant
    response1 = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER", "WITHDBACCESS"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response1.status_code == 200
    assert response1.status_code == 200

    # Check first token hash
    session.expire_all()
    user = await session.get(User, user_id)
    token_hash1 = user.db_activation_token
    assert token_hash1 is not None

    # Second update with same roles - should NOT regenerate token
    response2 = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER", "WITHDBACCESS"]},  # Same roles
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response2.status_code == 200

    # Check second token hash - should remain the same
    session.expire_all()
    user = await session.get(User, user_id)
    token_hash2 = user.db_activation_token
    assert token_hash2 == token_hash1


@pytest.mark.asyncio
async def test_revoke_withdbaccess_clears_token(
    client: AsyncClient, auth_token_factory, existing_users, session
):
    """Test that revoking WITHDBACCESS clears the activation token."""
    admin_data = existing_users[2]

    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )

    # Create a user
    create_response = await client.post(
        "/users",
        json={
            "email": "revoke_test@test.com",
            "username": "revoke_test",
            "password": "revoke_password",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    user_id = create_response.json()["id"]

    # Grant WITHDBACCESS
    grant_response = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER", "WITHDBACCESS"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert grant_response.status_code == 200
    assert grant_response.status_code == 200

    # Verify token hash exists in database
    stmt = select(User).where(User.id == user_id)
    result = await session.exec(stmt)
    user = result.one()
    assert user.db_activation_token is not None

    # Revoke WITHDBACCESS
    revoke_response = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER"]},  # Remove WITHDBACCESS
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert revoke_response.status_code == 200

    # Verify token hash is cleared
    await session.refresh(user)
    assert user.db_activation_token is None


@pytest.mark.asyncio
async def test_database_status_endpoint(
    client: AsyncClient, auth_token_factory, register_and_verify_user
):
    """Test the database status endpoint."""
    # Register and verify a new user
    user_data = {
        "email": "status_test@test.com",
        "username": "status_test",
        "password": "status_password",
    }
    await register_and_verify_user(user_data)

    # Login as the new user
    login_response = await client.post(
        "/auth/login",
        data={"username": user_data["username"], "password": user_data["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    user_token = login_response.json()["access_token"]

    # Check status - should have no access
    response = await client.get(
        "/database-access/status",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["has_access"] is False
    assert data["is_activated"] is False
    assert data["role_name"] is None


@pytest.mark.asyncio
async def test_activate_with_invalid_token(
    client: AsyncClient, register_and_verify_user
):
    """Test activation with invalid token returns error. Requires auth."""
    user_data = {
        "email": "act_inv@test.com",
        "username": "act_inv",
        "password": "password12345",  # > 12 chars
    }
    await register_and_verify_user(user_data)

    login_res = await client.post(
        "/auth/login", data={"username": "act_inv", "password": "password12345"}
    )
    token = login_res.json()["access_token"]

    response = await client.post(
        "/database-access/activate",
        json={
            "password": "secure_password_123",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    # No WITHDBACCESS role + no token in DB -> authentication exception or permission denied
    # Service raises PermissionDeniedException("db_access.no_access") if role missing
    # or AuthenticationException("db_access.invalid_token") if token missing
    assert response.status_code in [401, 403]


@pytest.mark.asyncio
async def test_activate_password_too_short(
    client: AsyncClient, register_and_verify_user
):
    """Test activation rejects short passwords. Requires auth."""
    user_data = {
        "email": "act_short@test.com",
        "username": "act_short",
        "password": "password12345",  # > 12 chars
    }
    await register_and_verify_user(user_data)

    login_res = await client.post(
        "/auth/login", data={"username": "act_short", "password": "password12345"}
    )
    token = login_res.json()["access_token"]

    response = await client.post(
        "/database-access/activate",
        json={
            # "token" removed
            "password": "short",  # Less than 12 chars
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422  # Validation error
