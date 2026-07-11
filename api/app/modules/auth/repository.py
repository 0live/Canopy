from typing import Optional

from sqlalchemy import delete, select

from app.core.repository import BaseRepository
from app.modules.auth.models import PasswordResetToken, RefreshToken


class AuthRepository(BaseRepository):
    """
    Repository for Auth module, handling Refresh Tokens and Password Reset Tokens.
    """

    async def create_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_refresh_token_by_hash(
        self, token_hash: str
    ) -> Optional[RefreshToken]:
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash, ~RefreshToken.revoked
        )
        result = await self.session.exec(stmt)
        return result.scalars().first()

    async def revoke_refresh_token(self, token_id: int) -> None:
        stmt = select(RefreshToken).where(RefreshToken.id == token_id)
        result = await self.session.exec(stmt)
        token = result.scalars().first()
        if token:
            token.revoked = True

    async def delete_all_user_tokens(self, user_id: int) -> None:
        stmt = delete(RefreshToken).where(RefreshToken.user_id == user_id)
        await self.session.exec(stmt)

    async def create_reset_token(self, token: PasswordResetToken) -> PasswordResetToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_reset_token_by_hash(
        self, token_hash: str
    ) -> Optional[PasswordResetToken]:
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            ~PasswordResetToken.used,
        )
        result = await self.session.exec(stmt)
        return result.scalars().first()

    async def mark_reset_token_used(self, token_id: int) -> None:
        stmt = select(PasswordResetToken).where(PasswordResetToken.id == token_id)
        result = await self.session.exec(stmt)
        token = result.scalars().first()
        if token:
            token.used = True

    async def delete_user_reset_tokens(self, user_id: int) -> None:
        stmt = delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        await self.session.exec(stmt)
