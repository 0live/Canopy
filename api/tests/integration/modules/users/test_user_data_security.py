import pytest
from httpx import AsyncClient

SENSITIVE_FIELDS = {"hashed_password", "verification_token", "password"}


def assert_no_sensitive_fields(data: dict | list) -> None:
    """Recursively assert that no sensitive fields appear in the response."""
    if isinstance(data, list):
        for item in data:
            assert_no_sensitive_fields(item)
    elif isinstance(data, dict):
        for field in SENSITIVE_FIELDS:
            assert field not in data, f"Sensitive field '{field}' found in response"
        for value in data.values():
            if isinstance(value, (dict, list)):
                assert_no_sensitive_fields(value)


@pytest.mark.asyncio
async def test_get_me_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    token = await auth_token_factory(
        username=existing_users[0]["username"], password=existing_users[0]["password"]
    )
    response = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert_no_sensitive_fields(response.json())


@pytest.mark.asyncio
async def test_get_user_by_id_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    admin_token = await auth_token_factory(
        username=existing_users[2]["username"], password=existing_users[2]["password"]
    )
    headers = {"Authorization": f"Bearer {admin_token}"}
    me = await client.get("/users/me", headers=headers)
    user_id = me.json()["id"]

    response = await client.get(f"/users/{user_id}", headers=headers)
    assert response.status_code == 200
    assert_no_sensitive_fields(response.json())


@pytest.mark.asyncio
async def test_get_all_users_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    admin_token = await auth_token_factory(
        username=existing_users[2]["username"], password=existing_users[2]["password"]
    )
    response = await client.get(
        "/users", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert_no_sensitive_fields(data["items"])


@pytest.mark.asyncio
async def test_create_user_as_admin_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    admin_token = await auth_token_factory(
        username=existing_users[2]["username"], password=existing_users[2]["password"]
    )
    new_user = {
        "email": "security_test@example.com",
        "username": "security_tester",
        "password": "ValidPass12345",
    }
    response = await client.post(
        "/users",
        json=new_user,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert_no_sensitive_fields(response.json())


@pytest.mark.asyncio
async def test_patch_user_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    token = await auth_token_factory(
        username=existing_users[0]["username"], password=existing_users[0]["password"]
    )
    headers = {"Authorization": f"Bearer {token}"}
    me = await client.get("/users/me", headers=headers)
    user_id = me.json()["id"]

    response = await client.patch(
        f"/users/{user_id}",
        json={"username": "baseUser_upd"},
        headers=headers,
    )
    assert response.status_code == 200
    assert_no_sensitive_fields(response.json())


@pytest.mark.asyncio
async def test_update_user_roles_no_sensitive_fields(
    client: AsyncClient, auth_token_factory, existing_users
):
    admin_token = await auth_token_factory(
        username=existing_users[2]["username"], password=existing_users[2]["password"]
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    users_resp = await client.get("/users", headers=headers)
    target_user = next(
        u for u in users_resp.json()["items"]
        if u["username"] == existing_users[0]["username"]
    )
    user_id = target_user["id"]

    response = await client.put(
        f"/users/{user_id}/roles",
        json={"roles": ["USER"]},
        headers=headers,
    )
    assert response.status_code == 200
    assert_no_sensitive_fields(response.json())
