import asyncio
from functools import lru_cache
from typing import Annotated, Dict, List, Optional

from fastapi import Depends, WebSocket, WebSocketDisconnect
from redis.asyncio import from_url

from app.core.config import Settings, get_settings
from app.core.database import SessionDep
from app.core.exceptions import (
    EntityNotFoundException,
    NotificationException,
)
from app.core.notifications.models import Notification
from app.core.notifications.repository import NotificationRepository
from app.core.notifications.schemas import NotificationMessage


class NotificationBroadcaster:
    """
    Singleton responsible for managing active WebSocket connections and Redis Pub/Sub.
    """

    _instance: Optional["NotificationBroadcaster"] = None

    def __init__(self, settings: Settings):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.listeners: Dict[int, asyncio.Task] = {}
        self.redis = from_url(str(settings.redis_url), decode_responses=True)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        if user_id not in self.listeners:
            self.listeners[user_id] = asyncio.create_task(self._redis_listener(user_id))

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.listeners:
                    self.listeners[user_id].cancel()
                    del self.listeners[user_id]

    async def _redis_listener(self, user_id: int):
        """
        Listens to the Redis channel for a specific user and forwards messages
        to all connected WebSockets for that user on this instance.
        """
        pubsub = self.redis.pubsub()
        channel = f"user:{user_id}"
        await pubsub.subscribe(channel)

        try:
            async for message in pubsub.listen():
                if message["type"] == "message":
                    data = message["data"]
                    if user_id in self.active_connections:
                        connections = list(self.active_connections[user_id])
                        for connection in connections:
                            try:
                                await connection.send_text(data)
                            except Exception:
                                self.disconnect(user_id, connection)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            raise NotificationException(
                key="notification.redis_error", params={"error": str(e)}
            ) from e
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except (Exception, RuntimeError):
                pass

    async def publish_to_user(self, user_id: int, message: NotificationMessage):
        """Publish a message to Redis for the given user."""
        channel = f"user:{user_id}"
        await self.redis.publish(channel, message.model_dump_json())

    async def handle_session(self, user_id: int, websocket: WebSocket):
        """
        Manages the WebSocket session lifecycle: connect, loop, disconnect.
        """
        try:
            await self.connect(user_id, websocket)
            try:
                while True:
                    await websocket.receive_text()
            except WebSocketDisconnect:
                self.disconnect(user_id, websocket)

        except Exception as e:
            if user_id:
                self.disconnect(user_id, websocket)
            raise NotificationException(
                key="notification.connection_error", params={"error": str(e)}
            ) from e

    async def shutdown(self):
        for task in self.listeners.values():
            task.cancel()
        await self.redis.aclose()


@lru_cache
def get_notification_broadcaster() -> NotificationBroadcaster:
    settings = get_settings()
    if NotificationBroadcaster._instance is None:
        NotificationBroadcaster._instance = NotificationBroadcaster(settings)
    return NotificationBroadcaster._instance


class NotificationService:
    def __init__(
        self,
        repository: NotificationRepository,
        broadcaster: NotificationBroadcaster,
    ):
        self.repository = repository
        self.broadcaster = broadcaster

    async def get_user_notifications(
        self, user_id: int, skip: int = 0, limit: int = 50, unread_only: bool = False
    ) -> List[Notification]:
        """Get notifications for a specific user."""
        try:
            return await self.repository.get_for_user(user_id, skip, limit, unread_only)
        except Exception as e:
            raise NotificationException(
                key="notification.fetch_failed", params={"error": str(e)}
            ) from e

    async def mark_read(self, notification_id: int, user_id: int) -> Notification:
        """Mark a notification as read."""
        notification = await self.repository.get_by_id_and_user(
            notification_id, user_id
        )
        if not notification:
            raise EntityNotFoundException(
                entity="Notification",
                key="notification.not_found",
                params={"id": notification_id},
            )

        notification.is_read = True
        try:
            self.repository.session.add(notification)
            await self.repository.session.flush()
        except Exception as e:
            raise NotificationException(
                key="notification.update_failed", params={"error": str(e)}
            ) from e
        return notification

    async def mark_all_read(self, user_id: int) -> dict:
        """Mark all notifications as read for a user."""
        try:
            await self.repository.mark_all_as_read(user_id)
        except Exception as e:
            raise NotificationException(
                key="notification.update_failed", params={"error": str(e)}
            ) from e
        return {"message": "All notifications marked as read"}

    async def send_to_user(
        self,
        user_id: int,
        message: NotificationMessage,
    ):
        """
        Persists the notification to DB and publishes it to Redis.
        """
        try:
            notification = Notification(
                user_id=user_id,
                type=message.type,
                payload=message.payload,
                created_at=message.timestamp,
                is_read=False,
            )
            self.repository.session.add(notification)
            await self.repository.session.flush()

            if message.payload is None:
                message.payload = {}
            message.payload["id"] = notification.id
            await self.broadcaster.publish_to_user(user_id, message)
        except Exception as e:
            raise NotificationException(
                key="notification.send_failed", params={"error": str(e)}
            ) from e


def get_notification_service(session: SessionDep) -> NotificationService:
    repository = NotificationRepository(session)
    broadcaster = get_notification_broadcaster()
    return NotificationService(repository, broadcaster)


NotificationServiceDep = Annotated[
    NotificationService, Depends(get_notification_service)
]
