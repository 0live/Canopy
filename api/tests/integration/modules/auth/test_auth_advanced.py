import pytest
from app.core.enums.app_parameter import AppParameter
from app.modules.users.models import User
from httpx import AsyncClient
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession


@pytest.mark.asyncio
async def test_refresh_token_flow(
    client: AsyncClient, session: AsyncSession, existing_users
):  # 1. Login with seeded user (from seeds.py: baseUser/baseUser)
    username = existing_users[0]["username"]
    password = existing_users[0]["password"]

    login_data = {"username": username, "password": password}
    response = await client.post("/auth/login", data=login_data)

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

    # Check Cookie
    cookie_name = AppParameter.REFRESH_TOKEN_COOKIE_NAME
    refresh_token_cookie = response.cookies.get(cookie_name)

    if not refresh_token_cookie:
        header = response.headers.get("set-cookie", "")
        if f"{cookie_name}=" in header:
            # Simple extraction
            parts = header.split(";")
            for part in parts:
                if part.strip().startswith(f"{cookie_name}="):
                    refresh_token_cookie = part.strip().split("=", 1)[1]
                    break

    assert refresh_token_cookie is not None

    # 2. Access protected endpoint with access token
    headers = {"Authorization": f"Bearer {data['access_token']}"}
    resp_me = await client.get("/users/me", headers=headers)
    assert resp_me.status_code == 200
    assert resp_me.json()["username"] == username

    # 3. Refresh Access Token
    # Send refresh request with cookie
    client.cookies.set(AppParameter.REFRESH_TOKEN_COOKIE_NAME, refresh_token_cookie)
    resp_refresh = await client.post("/auth/refresh")
    assert resp_refresh.status_code == 200
    new_data = resp_refresh.json()
    assert "access_token" in new_data
    # Note: Tokens might be identical if issued in the same second and the user payload is unchanged.
    # We focus on the fact that we got a 200 and a token.

    # Check new cookie set (Rotation)
    new_refresh_cookie = resp_refresh.cookies.get(cookie_name)
    if not new_refresh_cookie:
        header = resp_refresh.headers.get("set-cookie", "")
        if f"{cookie_name}=" in header:
            parts = header.split(";")
            for part in parts:
                if part.strip().startswith(f"{cookie_name}="):
                    new_refresh_cookie = part.strip().split("=", 1)[1]
                    break

    assert new_refresh_cookie is not None
    assert new_refresh_cookie != refresh_token_cookie

    # 4. Logout
    resp_logout = await client.post(
        "/auth/logout",
        cookies={AppParameter.REFRESH_TOKEN_COOKIE_NAME: new_refresh_cookie},
    )
    assert resp_logout.status_code == 200

    # 5. Try Refresh with old cookie (Should fail - Revoked)
    resp_fail = await client.post(
        "/auth/refresh",
        cookies={AppParameter.REFRESH_TOKEN_COOKIE_NAME: refresh_token_cookie},
    )
    assert resp_fail.status_code == 401


@pytest.mark.asyncio
async def test_email_verification_flow(client: AsyncClient, session: AsyncSession):
    # 1. Register
    register_data = {
        "email": "verify@test.com",
        "username": "verify_user",
        "password": "password12345",
        "altcha_payload": "dummy",
    }
    resp_reg = await client.post("/auth/register", json=register_data)
    assert resp_reg.status_code == 200
    user_data = resp_reg.json()
    user_id = user_data["id"]

    # Check DB - is_verified=False
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user_db = result.scalars().first()
    assert user_db.is_verified is False
    assert user_db.verification_token is not None
    token = user_db.verification_token

    # 2. Verify Email
    resp_verify = await client.get(f"/auth/verify?token={token}")
    assert resp_verify.status_code == 200
    assert "access_token" in resp_verify.json()

    # 3. Check DB - is_verified=True
    # Need to refresh or re-query
    session.expire_all()
    user_db = await session.get(User, user_id)
    assert user_db.is_verified is True
    assert user_db.verification_token is None
