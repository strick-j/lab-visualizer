"""
Pydantic schemas for settings management.

Defines request/response models for auth settings endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


class OIDCSettingsUpdate(BaseModel):
    """Request model for updating OIDC settings."""

    enabled: bool = Field(..., description="Enable or disable OIDC authentication")
    issuer: Optional[str] = Field(
        None,
        description="OIDC issuer URL (e.g., https://your-domain.okta.com)",
        max_length=500,
    )
    client_id: Optional[str] = Field(
        None, description="OIDC client ID", max_length=255
    )
    client_secret: Optional[str] = Field(
        None, description="OIDC client secret", max_length=500
    )
    display_name: Optional[str] = Field(
        None, description="Display name for the login button", max_length=100
    )


class OIDCSettingsResponse(BaseModel):
    """Response model for OIDC settings."""

    enabled: bool
    issuer: Optional[str] = None
    client_id: Optional[str] = None
    client_secret_configured: bool = False
    display_name: str = "OIDC"
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True


class AuthSettingsResponse(BaseModel):
    """Response model for all auth settings."""

    local_auth_enabled: bool
    oidc: OIDCSettingsResponse

    class Config:
        from_attributes = True


class TestConnectionRequest(BaseModel):
    """Request model for testing OIDC connection."""

    issuer: str = Field(..., description="OIDC issuer URL to test")


class TestConnectionResponse(BaseModel):
    """Response model for connection test."""

    success: bool
    message: str
    details: Optional[dict] = None
