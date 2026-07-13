from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete
from sqlmodel import select

from app.core.repository import BaseRepository
from app.modules.setup_root_user.models import RootUserSetupToken


class RootUserSetupRepository(BaseRepository[RootUserSetupToken]):
    """Repository for the root user (first admin) bootstrap setup token."""

    async def create_token(self, token: RootUserSetupToken) -> RootUserSetupToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_valid_token_by_hash(
        self, token_hash: str
    ) -> Optional[RootUserSetupToken]:
        stmt = select(RootUserSetupToken).where(
            RootUserSetupToken.token_hash == token_hash,
            RootUserSetupToken.expires_at > datetime.now(timezone.utc),
        )
        result = await self.session.exec(stmt)
        return result.first()

    async def delete_all_tokens(self) -> None:
        await self.session.exec(delete(RootUserSetupToken))
