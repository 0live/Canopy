from fastapi import APIRouter, Depends, Request

from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.modules.db_access.schemas import (
    DatabaseAccessStatus,
    DatabaseActivateRequest,
    DatabaseActivateResponse,
    DatabasePasswordUpdateRequest,
)
from app.modules.db_access.service import DbAccessServiceDep
from app.modules.users.schemas import UserDetail, UserDetailWithDbAccess

databaseAccessRouter = APIRouter(prefix="/database-access", tags=["Database Access"])


@databaseAccessRouter.post("/activate", response_model=DatabaseActivateResponse)
@limiter.limit("5/hour")
async def activate_database_access(
    request: Request,
    payload: DatabaseActivateRequest,
    service: DbAccessServiceDep,
    current_user: UserDetailWithDbAccess = Depends(get_current_user),
):
    """
    Activate database access using activation token.
    """
    return await service.activate_database_access(payload.password, current_user)


@databaseAccessRouter.patch("/password")
@limiter.limit("10/hour")
async def update_database_password(
    request: Request,
    payload: DatabasePasswordUpdateRequest,
    service: DbAccessServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """Update PostgreSQL role password for the current user."""
    return await service.update_role_password(payload.password, current_user)


@databaseAccessRouter.get("/status", response_model=DatabaseAccessStatus)
async def get_database_status(
    service: DbAccessServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """Get current user's database access status."""
    return await service.get_access_status(current_user)
