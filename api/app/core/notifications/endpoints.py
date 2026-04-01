from typing import Annotated

from fastapi import APIRouter, Depends, Response, WebSocket

from app.core.notifications.schemas import BulkDeleteRequest, NotificationRead
from app.core.schemas.paginated_response import PaginatedResponse
from app.core.notifications.service import (
    NotificationBroadcaster,
    NotificationServiceDep,
    get_notification_broadcaster,
)
from app.core.security import get_current_user, get_current_user_ws
from app.modules.users.schemas import UserDetail

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.websocket("/ws-notifications")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: int = Depends(get_current_user_ws),
    broadcaster: NotificationBroadcaster = Depends(get_notification_broadcaster),
):
    await broadcaster.handle_session(user_id, websocket)


@router.get("", response_model=PaginatedResponse[NotificationRead])
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
    items, total = await service.get_user_notifications(
        current_user.id, skip=skip, limit=limit, unread_only=unread_only
    )
    return PaginatedResponse(items=items, total=total, skip=skip, limit=limit)


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


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: int,
    current_user: Annotated[UserDetail, Depends(get_current_user)],
    service: NotificationServiceDep,
):
    """
    Delete a single notification (hard delete).
    """
    await service.delete_notification(notification_id, current_user.id)
    return Response(status_code=204)


@router.post("/bulk-delete", response_model=dict)
async def bulk_delete_notifications(
    body: BulkDeleteRequest,
    current_user: Annotated[UserDetail, Depends(get_current_user)],
    service: NotificationServiceDep,
):
    """
    Bulk delete notifications by IDs (hard delete, restricted to current user).
    """
    return await service.delete_notifications(body.notification_ids, current_user.id)
