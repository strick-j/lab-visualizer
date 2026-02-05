"""
FastAPI dependencies for authentication and authorization.

Provides reusable dependencies for protecting API routes.
"""

from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.auth import User
from app.models.database import get_db
from app.services.auth import validate_access_token

settings = get_settings()

# HTTP Bearer token security scheme
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user.

    Validates the Bearer token and returns the associated user.
    Raises 401 if authentication fails.
    """
    if not settings.auth_enabled:
        # Auth disabled - return a mock admin user for development
        return User(
            id=0,
            username="anonymous",
            display_name="Anonymous User",
            auth_provider="none",
            is_active=True,
            is_admin=True,
        )

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await validate_access_token(db, credentials.credentials)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, _ = result
    return user


async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Dependency to optionally get the current authenticated user.

    Returns None if no valid authentication is provided instead of raising an error.
    Useful for endpoints that behave differently for authenticated vs anonymous users.
    """
    if not settings.auth_enabled:
        return None

    if not credentials:
        return None

    result = await validate_access_token(db, credentials.credentials)
    if not result:
        return None

    user, _ = result
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active user.

    Raises 403 if the user is not active.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Dependency to get the current admin user.

    Raises 403 if the user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


class RequireAuth:
    """
    Dependency class for flexible authentication requirements.

    Usage:
        @router.get("/protected", dependencies=[Depends(RequireAuth())])
        async def protected_route():
            ...

        @router.get("/admin-only", dependencies=[Depends(RequireAuth(admin=True))])
        async def admin_route():
            ...
    """

    def __init__(self, admin: bool = False):
        self.admin = admin

    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if self.admin and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required",
            )
        return current_user
