import pytest
from httpx import AsyncClient


async def get_user_id_by_username(
    client: AsyncClient, token: str, username: str
) -> int:
    response = await client.get("/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    users = response.json()
    for user in users:
        if user["username"] == username:
            return user["id"]
    raise ValueError(f"User {username} not found")


@pytest.mark.asyncio
async def test_put_user_roles_admin(
    client: AsyncClient, auth_token_factory, existing_users
):
    """Test that admin can update user roles."""
    admin_data = existing_users[2]  # admin
    target_data = existing_users[0]  # user

    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )

    target_user_id = await get_user_id_by_username(
        client, admin_token, target_data["username"]
    )

    # 1. Update roles
    response = await client.put(
        f"/users/{target_user_id}/roles",
        json={"roles": ["ADMIN", "USER"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert "ADMIN" in response.json()["roles"]

    # 2. Verify persistence
    response = await client.get(
        f"/users/{target_user_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert "ADMIN" in response.json()["roles"]


@pytest.mark.asyncio
async def test_put_user_roles_forbidden(
    client: AsyncClient, auth_token_factory, existing_users
):
    """Test that regular user cannot update roles."""
    user_data = existing_users[0]  # user
    target_data = existing_users[1]  # editor (another user)
    admin_data = existing_users[2]  # admin (needed to fetch ID)

    # We need admin token just to find the ID of the target user first
    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )
    target_user_id = await get_user_id_by_username(
        client, admin_token, target_data["username"]
    )

    # Now get user token
    user_token = await auth_token_factory(
        username=user_data["username"], password=user_data["password"]
    )

    response = await client.put(
        f"/users/{target_user_id}/roles",
        json={"roles": ["ADMIN"]},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_patch_user_ignores_roles_admin(
    client: AsyncClient, auth_token_factory, existing_users
):
    """Test that PATCH /users/{id} ignores role updates even for admin."""
    admin_data = existing_users[2]
    target_data = existing_users[0]

    admin_token = await auth_token_factory(
        username=admin_data["username"], password=admin_data["password"]
    )
    target_user_id = await get_user_id_by_username(
        client, admin_token, target_data["username"]
    )

    # Try to set roles via PATCH
    response = await client.patch(
        f"/users/{target_user_id}",
        json={"roles": ["ADMIN"]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # It should succeed (200) but ignore the roles field
    assert response.status_code == 200

    # Verify roles are NOT updated
    check_response = await client.get(
        f"/users/{target_user_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    roles = check_response.json()["roles"]
    assert "ADMIN" not in roles  # Should remain USER only
