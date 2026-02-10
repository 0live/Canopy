import logging
from typing import Annotated, List

from fastapi import APIRouter, Depends, Query, WebSocket

from app.core.config import Settings, get_settings
from app.core.notifications.schemas import NotificationRead
from app.core.notifications.service import (
    NotificationBroadcaster,
    NotificationServiceDep,
    get_notification_broadcaster,
)
from app.core.security import get_current_user
from app.modules.users.schemas import UserDetail
from app.modules.users.service import UserServiceDep

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def get_current_user_ws(
    token: Annotated[str, Query()],
    user_service: UserServiceDep,
    notification_service: NotificationServiceDep,
    settings: Annotated[Settings, Depends(get_settings)],
) -> int:
    """
    Validate the token from the query string and return the user ID.
    """
    return await notification_service.authenticate(token, settings, user_service)


@router.websocket("/ws-notifications")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int = Depends(get_current_user_ws),
    broadcaster: NotificationBroadcaster = Depends(get_notification_broadcaster),
):
    await broadcaster.handle_session(user_id, websocket)


@router.get("/", response_model=List[NotificationRead])
async def get_notifications(
    current_user: Annotated[UserDetail, Depends(get_current_user)],
    service: NotificationServiceDep,
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
):
    """
    Get current user's notifications.
    """
    return await service.get_user_notifications(
        current_user.id, skip=skip, limit=limit, unread_only=unread_only
    )


@router.patch("/{notification_id}/read", response_model=NotificationRead)
async def mark_notification_read(
    notification_id: int,
    current_user: Annotated[UserDetail, Depends(get_current_user)],
    service: NotificationServiceDep,
):
    """
    Mark a notification as read.
    """
    return await service.mark_read(notification_id, current_user.id)


@router.patch("/read-all", response_model=dict)
async def mark_all_read(
    current_user: Annotated[UserDetail, Depends(get_current_user)],
    service: NotificationServiceDep,
):
    """
    Mark all notifications as read for the current user.
    """
    return await service.mark_all_read(current_user.id)
