import asyncio
import logging
from functools import lru_cache
from typing import Annotated, Any, Dict, List, Optional

from fastapi import Depends, WebSocket, WebSocketDisconnect
from redis.asyncio import from_url

from app.core.config import Settings, get_settings
from app.core.database import AsyncSession, SessionDep
from app.core.exceptions import AuthenticationException, EntityNotFoundException
from app.core.notifications.models import Notification
from app.core.notifications.repository import NotificationRepository
from app.core.notifications.schemas import NotificationMessage

logger = logging.getLogger(__name__)


class NotificationBroadcaster:
    """
    Singleton responsible for managing active WebSocket connections and Redis Pub/Sub.
    """

    _instance: Optional["NotificationBroadcaster"] = None

    def __init__(self, settings: Settings):
        # We still need to keep track of local websockets to send messages to them
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # We key listeners by user_id to know if we already have a subscription task running
        self.listeners: Dict[int, asyncio.Task] = {}

        # Create a Redis client. This client manages a connection pool automatically.
        # decode_responses=True ensures we get strings instead of bytes.
        self.redis = from_url(str(settings.redis_url), decode_responses=True)

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)

        # If this is the first connection for this user on this instance,
        # start listening to their Redis channel.
        if user_id not in self.listeners:
            self.listeners[user_id] = asyncio.create_task(self._redis_listener(user_id))

        logger.info(
            f"User {user_id} connected. Active connections: {len(self.active_connections.get(user_id, []))}"
        )

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)

            # If no more connections for this user locally, stop the Redis listener
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.listeners:
                    self.listeners[user_id].cancel()
                    del self.listeners[user_id]

        logger.info(f"User {user_id} disconnected")

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
                    # Data is already a string (JSON) because decode_responses=True

                    # Forward to all local websockets
                    if user_id in self.active_connections:
                        # Copy list to avoid issues if a connection drops during iteration
                        connections = list(self.active_connections[user_id])
                        for connection in connections:
                            try:
                                await connection.send_text(data)
                            except Exception as e:
                                logger.error(
                                    f"Failed to send message to user {user_id}: {e}"
                                )
                                # We could potentially disconnect here, but usually disconnect() handles cleanup
        except asyncio.CancelledError:
            # Expected when user disconnects
            pass
        except Exception as e:
            logger.error(f"Redis listener error for user {user_id}: {e}")
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except (Exception, RuntimeError):
                # Ignore errors during cleanup (e.g. if loop is closed)
                pass

    async def publish_to_user(self, user_id: int, message: NotificationMessage):
        """Publish a message to Redis for the given user."""
        channel = f"user:{user_id}"
        await self.redis.publish(channel, message.model_dump_json())

    async def shutdown(self):
        """Cleanup resources on app shutdown."""
        # Cancel all listeners
        for task in self.listeners.values():
            task.cancel()

        # Close Redis connection
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
        return await self.repository.get_for_user(user_id, skip, limit, unread_only)

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
        await self.repository.session.add(notification)
        await self.repository.session.commit()
        await self.repository.session.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: int) -> dict:
        """Mark all notifications as read for a user."""
        await self.repository.mark_all_as_read(user_id)
        await self.repository.session.commit()
        return {"message": "All notifications marked as read"}

    async def send_to_user(
        self,
        user_id: int,
        message: NotificationMessage,
        session: Optional[AsyncSession] = None,
    ):
        """
        Persists the notification to DB and publishes it to Redis.
        """
        # 1. Persist to DB
        # Use provided session or fallback to repository session (though usually provided in this context)
        db_session = session or self.repository.session

        notification = Notification(
            user_id=user_id,
            type=message.type,
            payload=message.payload,
            created_at=message.timestamp,
            is_read=False,
        )
        db_session.add(notification)
        await db_session.commit()
        await db_session.refresh(notification)

        # Update message payload with ID for frontend reference
        if message.payload is None:
            message.payload = {}
        message.payload["id"] = notification.id

        # 2. Publish to Redis via Broadcaster
        await self.broadcaster.publish_to_user(user_id, message)

    async def authenticate(
        self, token: str, settings: Settings, user_service: Any
    ) -> int:
        """
        Validates the token from the query string and return the user ID.
        """
        # 1. Decode token (no DB needed yet)
        try:
            from app.core.security import decode_token

            payload = decode_token(token, settings)
            username = payload.get("username")
            if username is None:
                raise AuthenticationException(
                    params={"detail": "auth.invalid_credentials"}
                )
        except Exception:
            # We can't raise HTTP exceptions in WebSocket handshake easily
            raise AuthenticationException("Invalid token")

        # 2. Access DB to verify user exists and is active
        try:
            user = await user_service.get_by_username(username)
            if not user:
                raise AuthenticationException("User not found")
            if not user.is_verified:
                raise AuthenticationException("User not verified")
            return user.id
        except Exception as e:
            logger.error(f"WebSocket auth failed: {e}")
            raise AuthenticationException("Auth failed")

    async def handle_session(self, user_id: int, websocket: WebSocket):
        """
        Manages the WebSocket session lifecycle: connect, loop, disconnect.
        """
        try:
            await self.broadcaster.connect(user_id, websocket)

            # Keep connection alive
            try:
                while True:
                    # We expect to receive nothing, or maybe pings.
                    # If the client sends data, we just ignore it or log it.
                    await websocket.receive_text()
            except WebSocketDisconnect:
                self.broadcaster.disconnect(user_id, websocket)

        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            if user_id:
                self.broadcaster.disconnect(user_id, websocket)


def get_notification_service(
    session: SessionDep,
) -> NotificationService:
    repository = NotificationRepository(session, Notification)
    broadcaster = get_notification_broadcaster()
    return NotificationService(repository, broadcaster)


NotificationServiceDep = Annotated[
    NotificationService, Depends(get_notification_service)
]
