"""
User management API routes.

Provides endpoints for user account operations such as password changes,
user listing, status management, and role assignment.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_admin_user
from app.models.auth import User
from app.models.database import get_db
from app.schemas.auth import (
    PasswordChange,
    UserListResponse,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services.auth import (
    change_user_password,
    list_all_users,
    revoke_all_user_sessions,
    update_user_role,
    update_user_status,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.put("/{user_id}/password", response_model=UserResponse)
async def update_user_password(
    user_id: int,
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Change a user's password.

    Users can only change their own password. Requires the current password
    for verification. Only supported for local authentication accounts.
    """
    if current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only change your own password",
        )

    try:
        await change_user_password(
            db,
            current_user,
            password_data.current_password,
            password_data.new_password,
        )
    except ValueError as e:
        error_message = str(e)
        if "incorrect" in error_message.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error_message,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )

    # Revoke all other sessions so user must re-authenticate with new password
    await revoke_all_user_sessions(db, current_user.id)

    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("", response_model=UserListResponse)
async def get_users(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all users.

    Requires admin privileges. Returns both local and OIDC users
    with their current status and role information.
    """
    users = await list_all_users(db)
    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=len(users),
    )


@router.patch("/{user_id}/status", response_model=UserResponse)
async def patch_user_status(
    user_id: int,
    status_update: UserStatusUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enable or disable a user account.

    Requires admin privileges. Admins cannot deactivate their own account.
    Deactivating a user revokes all their active sessions.
    """
    try:
        user = await update_user_status(
            db, user_id, status_update.is_active, current_user
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/role", response_model=UserResponse)
async def patch_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's role.

    Requires admin privileges. Admins cannot remove their own admin role.
    Valid roles: 'user', 'admin'.
    """
    try:
        user = await update_user_role(db, user_id, role_update.role, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return UserResponse.model_validate(user)
