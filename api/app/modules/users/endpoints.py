from fastapi import APIRouter, Depends, Query

from app.core.enums.app_parameter import AppParameter
from app.core.schemas.paginated_response import PaginatedResponse
from app.core.security import get_current_user
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
async def patch_user(
    user_id: int,
    user: UserUpdate,
    service: UserServiceDep,
    current_user: UserDetail = Depends(get_current_user),
):
    return await service.update_user(user_id, user, current_user)


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
