from typing import List, Optional

from sqlalchemy import update
from sqlmodel import select

from app.core.database import SessionDep
from app.core.notifications.models import Notification
from app.core.repository import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    """Repository for Notification entities."""

    def __init__(self, session: SessionDep):
        super().__init__(session, Notification)

    async def get_for_user(
        self, user_id: int, skip: int = 0, limit: int = 50, unread_only: bool = False
    ) -> List[Notification]:
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        if unread_only:
            query = query.where(Notification.is_read.is_(False))

        result = await self.session.exec(query)
        return list(result.all())

    async def get_by_id_and_user(
        self, notification_id: int, user_id: int
    ) -> Optional[Notification]:
        query = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        result = await self.session.exec(query)
        return result.first()

    async def mark_all_as_read(self, user_id: int) -> None:
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        await self.session.exec(stmt)
