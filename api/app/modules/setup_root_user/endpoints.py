from fastapi import APIRouter, Request

from app.core.rate_limit import limiter
from app.modules.setup_root_user.schemas import CompleteRootUserSetupRequest
from app.modules.setup_root_user.service import RootUserSetupServiceDep
from app.modules.users.schemas import UserDetail

setupRootUserRouter = APIRouter(prefix="/setup", tags=["Setup Root User"])


@setupRootUserRouter.post("/complete", response_model=UserDetail)
@limiter.limit("5/hour")
async def complete_setup(
    request: Request,
    payload: CompleteRootUserSetupRequest,
    service: RootUserSetupServiceDep,
):
    """Complete the first-run setup by creating the initial administrator account."""
    return await service.complete_setup(payload)
