"""
User management API routes.

Provides endpoints for user account operations such as password changes.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.models.auth import User
from app.models.database import get_db
from app.schemas.auth import PasswordChange, UserResponse
from app.services.auth import change_user_password, revoke_all_user_sessions

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
