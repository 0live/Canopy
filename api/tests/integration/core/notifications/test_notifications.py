import pytest
from app.main import app
from starlette.testclient import TestClient


@pytest.mark.asyncio
async def test_role_update_notification(
    client,
    auth_token_factory,
    session,
    existing_users,  # Creates admin, user, editor
):
    # We want to test that when Admin updates User roles, User gets notified.

    # 1. Admin Login
    admin_token = await auth_token_factory(username="admin", password="admin")

    # 2. User Login & WS Connection
    user_token = await auth_token_factory(username="user", password="user")

    # 3. Get User ID
    from app.modules.users.models import User
    from sqlmodel import select

    result = await session.exec(select(User).where(User.username == "user"))
    target_user = result.first()
    assert target_user is not None

    with TestClient(app) as tc:
        with tc.websocket_connect(
            f"/notifications/ws-notifications?token={user_token}"
        ) as websocket:
            # 4. Admin updates User roles via API
            new_roles = ["USER", "LOAD_DATA"]
            # Use TestClient (tc) instead of AsyncClient (client) to ensure everything runs in the same loop/thread
            # because NotificationService singleton shares the Redis connection
            response = tc.put(
                f"/users/{target_user.id}/roles",
                json={"roles": new_roles},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert response.status_code == 200

            # 5. Verify Notification
            received = websocket.receive_json()
            assert received["type"] == "INFO"
            assert set(received["payload"]["new_roles"]) == set(new_roles)
