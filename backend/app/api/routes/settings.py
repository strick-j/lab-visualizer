"""
Settings API routes.

Provides admin-only endpoints for managing authentication configuration.
"""

import ipaddress
import logging
import socket
from urllib.parse import urlparse

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


def _validate_issuer_and_build_discovery_url(issuer_input: str) -> str:
    """
    Validate the OIDC issuer and return a safely-constructed discovery URL.

    Parses the issuer, enforces HTTPS, rejects IP-literal hosts and
    private/internal addresses, then reconstructs the URL from validated
    components to prevent SSRF (breaks the taint chain).

    Raises HTTPException if validation fails.
    """
    stripped = issuer_input.strip().rstrip("/")

    try:
        parsed = urlparse(stripped)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format for OIDC issuer",
        )

    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC issuer must be a valid HTTPS URL with a hostname",
        )

    hostname = parsed.hostname

    # Reject raw IP addresses used as hostnames
    try:
        ipaddress.ip_address(hostname)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC issuer must use a domain name, not an IP address",
        )
    except ValueError:
        pass  # Not an IP literal — expected for domain names

    # Resolve the hostname and reject private / internal IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to resolve OIDC issuer host",
        )

    if not addr_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OIDC issuer hostname did not resolve to any address",
        )

    for _, _, _, _, sockaddr in addr_info:
        ip = ipaddress.ip_address(sockaddr[0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OIDC issuer host must not resolve to a private or internal IP",
            )

    # Reconstruct the URL from validated components (breaks taint propagation)
    port_suffix = f":{parsed.port}" if parsed.port and parsed.port != 443 else ""
    base_path = parsed.path.rstrip("/") if parsed.path else ""
    discovery_url = (
        f"https://{hostname}{port_suffix}{base_path}"
        "/.well-known/openid-configuration"
    )

    return discovery_url


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
        discovery_url = _validate_issuer_and_build_discovery_url(test_data.issuer)

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
