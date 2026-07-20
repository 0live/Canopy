import asyncio
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.core import models  # noqa: F401
from app.core.enums.app_parameter import AppParameter
from app.core.notifications.models import Notification  # noqa: F401
from app.modules.setup_root_user.models import RootUserSetupToken
from app.modules.setup_root_user.repository import RootUserSetupRepository
from app.modules.users.enums import UserRole
from app.modules.users.models import User
from app.modules.users.repository import UserRepository


async def bootstrap_root_user_setup(session) -> None:
    """
    If no administrator exists yet, (re)generate a one-time setup token and
    print the setup URL to the terminal. No-op if an admin already exists.
    Safe to re-run: each run invalidates any previous, unused token.
    """
    from app.core.config import get_settings

    settings = get_settings()

    user_repo = UserRepository(session, User)
    if await user_repo.exists_with_role(UserRole.ADMIN):
        print("ℹ️  An administrator account already exists. Nothing to do.")
        return

    setup_repo = RootUserSetupRepository(session, RootUserSetupToken)
    await setup_repo.delete_all_tokens()

    token = secrets.token_urlsafe(AppParameter.TOKEN_LENGTH)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=AppParameter.ADMIN_SETUP_TOKEN_EXPIRE_MINUTES
    )
    await setup_repo.create_token(
        RootUserSetupToken(token_hash=token_hash, expires_at=expires_at)
    )
    await session.commit()

    setup_url = f"https://{settings.site_address}/setup?token={token}"
    print(
        "✅ No administrator account found. Visit this URL to create one "
        f"(valid {AppParameter.ADMIN_SETUP_TOKEN_EXPIRE_MINUTES} minutes):\n"
        f"{setup_url}"
    )


if __name__ == "__main__":

    async def main():
        from app.core.config import get_settings
        from app.core.database import get_engine, sessionmanager
        from sqlmodel.ext.asyncio.session import AsyncSession

        try:
            settings = get_settings()
            sessionmanager.init(str(settings.database_url))
            async with AsyncSession(get_engine()) as session:
                await bootstrap_root_user_setup(session)
            await sessionmanager.close()
        except Exception as e:
            print(f"❌ Error while bootstrapping admin setup: {e}")
            exit(1)

    asyncio.run(main())
