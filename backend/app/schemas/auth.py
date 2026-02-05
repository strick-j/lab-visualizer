"""
Pydantic schemas for authentication.

Defines request/response models for authentication endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Request model for local login."""

    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Response model for authentication tokens."""

    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshTokenRequest(BaseModel):
    """Request model for token refresh."""

    refresh_token: str


class UserResponse(BaseModel):
    """Response model for user information."""

    id: int
    username: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    auth_provider: str
    is_active: bool
    is_admin: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Request model for creating a local user."""

    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    is_admin: bool = False


class PasswordChange(BaseModel):
    """Request model for changing password."""

    current_password: str
    new_password: str = Field(..., min_length=8)


class AuthConfigResponse(BaseModel):
    """Response model for authentication configuration."""

    local_auth_enabled: bool
    oidc_enabled: bool
    oidc_issuer: Optional[str] = None
    oidc_display_name: Optional[str] = None


class OIDCCallbackRequest(BaseModel):
    """Request model for OIDC callback."""

    code: str
    state: str


class LogoutResponse(BaseModel):
    """Response model for logout."""

    message: str = "Successfully logged out"
