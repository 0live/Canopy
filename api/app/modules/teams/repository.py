from typing import Any, List, Optional

from sqlmodel import select

from app.core.enums.access_policy import AccessPolicy
from app.core.repository import BaseRepository
from app.modules.teams.models import Team, UserTeamLink
from app.modules.users.models import User


class TeamRepository(BaseRepository[Team]):
    """Repository for Team entities."""

    def _build_query(self, user: Optional[User], filter_by_access: bool):
        query = select(Team).distinct()
        if filter_by_access and user:
            query = query.outerjoin(UserTeamLink).where(
                (Team.created_by_id == user.id)
                | (Team.access_policy == AccessPolicy.PUBLIC)
                | (UserTeamLink.user_id == user.id)
            )
        return query

    async def get_all(
        self,
        user: Optional[User] = None,
        options: Optional[List[Any]] = None,
        filter_by_access: bool = True,
        skip: int = 0,
        limit: int = 25,
    ) -> List[Team]:
        query = self._build_query(user, filter_by_access)
        if options:
            for option in options:
                query = query.options(option)
        result = await self.session.exec(query.offset(skip).limit(limit))
        return list(result.all())

    async def count(self, user: Optional[User] = None, filter_by_access: bool = True) -> int:
        return await self.count_from_query(self._build_query(user, filter_by_access))

    async def is_member(self, team_id: int, user_id: int) -> bool:
        """Check if a user is a member of a team efficiently."""
        query = select(UserTeamLink).where(
            UserTeamLink.team_id == team_id,
            UserTeamLink.user_id == user_id,
        )
        result = await self.session.exec(query)
        return result.first() is not None
