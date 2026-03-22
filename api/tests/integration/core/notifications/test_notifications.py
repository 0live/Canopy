import pytest
from app.core.enums.app_parameter import AppParameter
from app.core.notifications.service import get_notification_broadcaster
from app.main import app
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


@pytest.mark.asyncio
async def test_websocket_rejects_disallowed_origin(auth_token_factory, existing_users):
    admin_token = await auth_token_factory(username="admin", password="admin")
    broadcaster = get_notification_broadcaster()
    original = broadcaster._allowed_origins
    broadcaster._allowed_origins = {"https://trusted.example.com"}
    try:
        with TestClient(app) as tc:
            with pytest.raises(WebSocketDisconnect) as exc_info:
                with tc.websocket_connect(
                    f"/notifications/ws-notifications?token={admin_token}",
                    headers={"origin": "https://evil.com"},
                ):
                    pass
            assert exc_info.value.code == 1008
    finally:
        broadcaster._allowed_origins = original


@pytest.mark.asyncio
async def test_websocket_rejects_oversized_message(auth_token_factory, existing_users):
    admin_token = await auth_token_factory(username="admin", password="admin")
    with TestClient(app) as tc:
        with tc.websocket_connect(
            f"/notifications/ws-notifications?token={admin_token}"
        ) as ws:
            ws.send_text("x" * (AppParameter.WS_MAX_MSG_BYTES + 1))
            with pytest.raises(WebSocketDisconnect) as exc_info:
                ws.receive_text()
            assert exc_info.value.code == 1009


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
    user_token = await auth_token_factory(username="baseUser", password="baseUser")

    # 3. Get User ID
    from app.modules.users.models import User
    from sqlmodel import select

    result = await session.exec(select(User).where(User.username == "baseUser"))
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
