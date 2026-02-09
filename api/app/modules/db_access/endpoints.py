from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.modules.db_access.schemas import (
    DatabaseAccessStatus,
    DatabaseActivateRequest,
    DatabaseActivateResponse,
)
from app.modules.db_access.service import DbAccessServiceDep
from app.modules.users.schemas import UserDetail

# Rename router tag for consistency? Maybe keep "Database" for readability in docs.
databaseRouter = APIRouter(prefix="/database", tags=["Database"])


@databaseRouter.post("/activate", response_model=DatabaseActivateResponse)
async def activate_database_access(
    request: DatabaseActivateRequest,
    service: DbAccessServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """
    Activate database access using activation token.

    The token is provided by an administrator after granting WITHDBACCESS role.
    The user chooses their own database password (min 12 characters).
    """
    return await service.activate_database_access(
        request.token, request.password, current_user
    )


@databaseRouter.get("/status", response_model=DatabaseAccessStatus)
async def get_database_status(
    service: DbAccessServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """Get current user's database access status."""
    return await service.get_access_status(current_user)
