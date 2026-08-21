from fastapi import APIRouter, Depends, Query, Request

from app.core.enums.app_parameter import AppParameter
from app.core.rate_limit import limiter
from app.core.schemas.paginated_response import PaginatedResponse
from app.core.security import get_current_user
from app.modules.auth.services.auth_service import AuthServiceDep
from app.modules.users.schemas import (
    AdminUserSummary,
    UserCreate,
    UserDetail,
    UserRoleUpdate,
    UserUpdate,
)
from app.modules.users.service import UserServiceDep

userRouter = APIRouter(prefix="/users", tags=["Users"])


@userRouter.post("", response_model=UserDetail)
async def create_user_as_admin(
    user: UserCreate,
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """Create a new user (Admin only)."""
    return await service.create_user_by_admin(user, current_user)


@userRouter.get("", response_model=PaginatedResponse[AdminUserSummary])
async def get_all_users(
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
    skip: int = Query(default=AppParameter.PAGINATION_DEFAULT_SKIP, ge=0),
    limit: int = Query(
        default=AppParameter.PAGINATION_DEFAULT_LIMIT,
        ge=1,
        le=AppParameter.PAGINATION_MAX_LIMIT,
    ),
):
    users, total = await service.get_all_users(current_user, skip=skip, limit=limit)
    return PaginatedResponse(items=users, total=total, skip=skip, limit=limit)


@userRouter.get("/me", response_model=UserDetail)
def get_me(current_user: UserDetail = Depends(get_current_user)):
    return current_user


@userRouter.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: int,
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    return await service.get_user_by_id(user_id, current_user)


@userRouter.patch("/{user_id}", response_model=UserDetail)
@limiter.limit("5/minute")
async def patch_user(
    request: Request,
    user_id: int,
    user: UserUpdate,
    service: UserServiceDep,
    auth_service: AuthServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    updated_user = await service.update_user(user_id, user, current_user)
    if user.password is not None:
        # Done here rather than in UserService to avoid a circular import
        # (AuthService already depends on UserService).
        await auth_service.revoke_user_sessions(user_id)
    return updated_user


@userRouter.delete("/{user_id}")
async def delete_user(
    user_id: int,
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    return await service.delete_user(user_id, current_user)


@userRouter.put("/{user_id}/roles", response_model=UserDetail)
async def update_user_roles(
    user_id: int,
    role_update: UserRoleUpdate,
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    """
    Update user roles (Admin only).
    """
    return await service.update_user_roles(user_id, role_update, current_user)
