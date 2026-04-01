from typing import List, Optional, Tuple

from sqlalchemy import delete, func, update
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
    ) -> Tuple[List[Notification], int]:
        base_filter = [Notification.user_id == user_id]
        if unread_only:
            base_filter.append(Notification.is_read.is_(False))

        count_result = await self.session.exec(
            select(func.count()).select_from(Notification).where(*base_filter)
        )
        total = count_result.one()

        items_result = await self.session.exec(
            select(Notification)
            .where(*base_filter)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(items_result.all()), total

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

    async def delete_by_id_and_user(self, notification_id: int, user_id: int) -> bool:
        notification = await self.get_by_id_and_user(notification_id, user_id)
        if not notification:
            return False
        await self.session.delete(notification)
        return True

    async def delete_bulk(self, notification_ids: List[int], user_id: int) -> int:
        stmt = delete(Notification).where(
            Notification.id.in_(notification_ids),
            Notification.user_id == user_id,
        )
        result = await self.session.exec(stmt)
        return result.rowcount
