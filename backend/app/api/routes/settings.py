"""
Settings API routes.

Provides admin-only endpoints for managing authentication configuration.
"""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user
from app.config import get_settings
from app.models.auth import User
from app.models.database import get_db
from app.schemas.settings import (
    AuthSettingsResponse,
    OIDCSettingsResponse,
    OIDCSettingsUpdate,
    TestConnectionRequest,
    TestConnectionResponse,
)
from app.services.settings import get_or_create_auth_settings, update_oidc_settings

logger = logging.getLogger(__name__)
router = APIRouter()
env_settings = get_settings()


@router.get("", response_model=AuthSettingsResponse)
async def get_settings_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get all authentication settings. Admin only."""
    settings = await get_or_create_auth_settings(db)

    return AuthSettingsResponse(
        local_auth_enabled=env_settings.local_auth_enabled,
        oidc=OIDCSettingsResponse(
            enabled=settings.oidc_enabled,
            issuer=settings.oidc_issuer,
            client_id=settings.oidc_client_id,
            client_secret_configured=bool(settings.oidc_client_secret),
            display_name=settings.oidc_display_name or "OIDC",
            access_token_expire_minutes=(
                settings.access_token_expire_minutes
                or env_settings.access_token_expire_minutes
            ),
            refresh_token_expire_days=(
                settings.refresh_token_expire_days
                or env_settings.refresh_token_expire_days
            ),
            updated_at=settings.updated_at,
            updated_by=settings.updated_by,
        ),
    )


@router.get("/oidc", response_model=OIDCSettingsResponse)
async def get_oidc_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get OIDC settings. Admin only."""
    settings = await get_or_create_auth_settings(db)

    return OIDCSettingsResponse(
        enabled=settings.oidc_enabled,
        issuer=settings.oidc_issuer,
        client_id=settings.oidc_client_id,
        client_secret_configured=bool(settings.oidc_client_secret),
        display_name=settings.oidc_display_name or "OIDC",
        access_token_expire_minutes=(
            settings.access_token_expire_minutes
            or env_settings.access_token_expire_minutes
        ),
        refresh_token_expire_days=(
            settings.refresh_token_expire_days or env_settings.refresh_token_expire_days
        ),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.put("/oidc", response_model=OIDCSettingsResponse)
async def update_oidc_settings_endpoint(
    update_data: OIDCSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update OIDC settings. Admin only."""
    # Validate that required fields are provided when enabling
    if update_data.enabled:
        if not update_data.issuer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OIDC issuer URL is required when enabling OIDC",
            )
        if not update_data.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OIDC client ID is required when enabling OIDC",
            )

    settings = await update_oidc_settings(
        db,
        enabled=update_data.enabled,
        issuer=update_data.issuer,
        client_id=update_data.client_id,
        client_secret=update_data.client_secret,
        display_name=update_data.display_name,
        access_token_expire_minutes=update_data.access_token_expire_minutes,
        refresh_token_expire_days=update_data.refresh_token_expire_days,
        updated_by=current_user.username,
    )

    return OIDCSettingsResponse(
        enabled=settings.oidc_enabled,
        issuer=settings.oidc_issuer,
        client_id=settings.oidc_client_id,
        client_secret_configured=bool(settings.oidc_client_secret),
        display_name=settings.oidc_display_name or "OIDC",
        access_token_expire_minutes=(
            settings.access_token_expire_minutes
            or env_settings.access_token_expire_minutes
        ),
        refresh_token_expire_days=(
            settings.refresh_token_expire_days or env_settings.refresh_token_expire_days
        ),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.post("/oidc/test", response_model=TestConnectionResponse)
async def test_oidc_connection(
    test_data: TestConnectionRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """Test OIDC connection by fetching the discovery document. Admin only."""
    try:
        discovery_url = (
            f"{test_data.issuer.rstrip('/')}/.well-known/openid-configuration"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(discovery_url)
            response.raise_for_status()
            config = response.json()

        return TestConnectionResponse(
            success=True,
            message="Successfully connected to OIDC provider",
            details={
                "issuer": config.get("issuer"),
                "authorization_endpoint": config.get("authorization_endpoint"),
                "token_endpoint": config.get("token_endpoint"),
                "userinfo_endpoint": config.get("userinfo_endpoint"),
            },
        )

    except httpx.HTTPStatusError as e:
        return TestConnectionResponse(
            success=False,
            message=f"HTTP error: {e.response.status_code}",
            details={"url": discovery_url},
        )
    except httpx.RequestError as e:
        return TestConnectionResponse(
            success=False,
            message=f"Connection error: {str(e)}",
            details={"url": discovery_url},
        )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Error: {str(e)}",
        )
