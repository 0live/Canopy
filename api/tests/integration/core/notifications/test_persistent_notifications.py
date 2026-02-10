import pytest
from app.core.notifications.models import Notification
from app.main import app
from app.modules.users.models import User
from sqlmodel import select
from starlette.testclient import TestClient


@pytest.mark.asyncio
async def test_persistent_notifications_lifecycle(
    client,
    auth_token_factory,
    session,
    existing_users,  # Creates admin, user, editor
):
    """
    Test the full lifecycle of persistent notifications:
    1. Create notification (via role update)
    2. Verify it's in DB
    3. Retrieve via GET /notifications
    4. Mark as read
    5. Verify updated status
    """

    # 1. Setup - Login as Admin and User
    admin_token = await auth_token_factory(username="admin", password="admin")
    user_token = await auth_token_factory(username="user", password="user")

    # Get User ID
    result = await session.exec(select(User).where(User.username == "user"))
    target_user = result.first()
    assert target_user is not None

    with TestClient(app) as tc:
        # Connect WS to trigger any listener setup (though not strictly needed for persistence)
        # We purposely do NOT connect WS here to prove persistence works even if offline?
        # Actually NotificationService sends to DB *before* Redis, so it should work.

        # 2. Trigger Notification (Role Update)
        new_roles = ["USER", "LOAD_DATA"]
        response = tc.put(
            f"/users/{target_user.id}/roles",
            json={"roles": new_roles},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert response.status_code == 200

        # 3. Verify in DB directly
        # We need to refresh session or query again
        notifications = await session.exec(
            select(Notification).where(Notification.user_id == target_user.id)
        )
        notifications = notifications.all()
        assert len(notifications) > 0
        latest_notif = notifications[-1]
        assert latest_notif.is_read is False
        assert latest_notif.type == "INFO"

        # 4. Verify via API (GET /notifications)
        response = tc.get(
            "/notifications/",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Check that the latest notification is present
        api_notif = next((n for n in data if n["id"] == latest_notif.id), None)
        assert api_notif is not None
        assert api_notif["is_read"] is False

        # 5. Mark as read
        response = tc.patch(
            f"/notifications/{latest_notif.id}/read",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        assert response.json()["is_read"] is True

        # 6. Verify "read-all"
        # First trigger another one to have something unread
        tc.put(
            f"/users/{target_user.id}/roles",
            json={"roles": ["USER"]},  # Revert roles
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        response = tc.patch(
            "/notifications/read-all",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200

        # Verify all are read
        response = tc.get(
            "/notifications/",
            params={"unread_only": True},
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert response.status_code == 200
        assert len(response.json()) == 0
