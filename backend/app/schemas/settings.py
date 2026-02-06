"""
Pydantic schemas for settings management.

Defines request/response models for auth settings endpoints.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class OIDCSettingsUpdate(BaseModel):
    """Request model for updating OIDC settings."""

    enabled: bool = Field(..., description="Enable or disable OIDC authentication")
    issuer: Optional[str] = Field(
        None,
        description="OIDC issuer URL (e.g., https://your-domain.okta.com)",
        max_length=500,
    )
    client_id: Optional[str] = Field(None, description="OIDC client ID", max_length=255)
    client_secret: Optional[str] = Field(
        None, description="OIDC client secret", max_length=500
    )
    display_name: Optional[str] = Field(
        None, description="Display name for the login button", max_length=100
    )
    access_token_expire_minutes: Optional[int] = Field(
        None, description="Access token expiration in minutes", ge=1, le=1440
    )
    refresh_token_expire_days: Optional[int] = Field(
        None, description="Refresh token expiration in days", ge=1, le=365
    )


class OIDCSettingsResponse(BaseModel):
    """Response model for OIDC settings."""

    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    issuer: Optional[str] = None
    client_id: Optional[str] = None
    client_secret_configured: bool = False
    display_name: str = "OIDC"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class AuthSettingsResponse(BaseModel):
    """Response model for all auth settings."""

    model_config = ConfigDict(from_attributes=True)

    local_auth_enabled: bool
    oidc: OIDCSettingsResponse


class TestConnectionRequest(BaseModel):
    """Request model for testing OIDC connection."""

    issuer: str = Field(..., description="OIDC issuer URL to test")


class TestConnectionResponse(BaseModel):
    """Response model for connection test."""

    success: bool
    message: str
    details: Optional[dict] = None


# =============================================================================
# Terraform State Bucket Schemas
# =============================================================================


class TerraformBucketCreate(BaseModel):
    """Request model for creating a Terraform state bucket configuration."""

    bucket_name: str = Field(
        ..., description="S3 bucket name", min_length=3, max_length=255
    )
    region: Optional[str] = Field(
        None,
        description="AWS region for the bucket (defaults to app region)",
        max_length=30,
    )
    description: Optional[str] = Field(
        None, description="Description of what this bucket contains", max_length=500
    )
    prefix: Optional[str] = Field(
        None,
        description="S3 key prefix to filter state files (e.g., 'lab/')",
        max_length=500,
    )
    enabled: bool = Field(True, description="Whether this bucket is active")


class TerraformBucketUpdate(BaseModel):
    """Request model for updating a Terraform state bucket configuration."""

    bucket_name: Optional[str] = Field(
        None, description="S3 bucket name", min_length=3, max_length=255
    )
    region: Optional[str] = Field(None, description="AWS region", max_length=30)
    description: Optional[str] = Field(None, description="Description", max_length=500)
    prefix: Optional[str] = Field(None, description="S3 key prefix", max_length=500)
    enabled: Optional[bool] = Field(None, description="Whether this bucket is active")


class TerraformBucketResponse(BaseModel):
    """Response model for a Terraform state bucket configuration."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    bucket_name: str
    region: Optional[str] = None
    description: Optional[str] = None
    prefix: Optional[str] = None
    enabled: bool = True
    created_at: datetime
    updated_at: datetime


class TerraformBucketsListResponse(BaseModel):
    """Response model for listing all configured Terraform state buckets."""

    buckets: List[TerraformBucketResponse]
    total: int
