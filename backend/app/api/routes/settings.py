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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin_user
from app.config import get_settings
from app.models.auth import User
from app.models.database import get_db
from app.models.resources import TerraformStateBucket, TerraformStatePath
from app.schemas.settings import (
    AuthSettingsResponse,
    OIDCSettingsResponse,
    OIDCSettingsUpdate,
    TerraformBucketCreate,
    TerraformBucketResponse,
    TerraformBucketsListResponse,
    TerraformBucketUpdate,
    TerraformPathCreate,
    TerraformPathResponse,
    TerraformPathUpdate,
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


# =============================================================================
# Terraform State Bucket Management
# =============================================================================


async def _ensure_env_bucket(db: AsyncSession) -> None:
    """
    If TF_STATE_BUCKET is set in the environment but no matching DB row
    exists, auto-create one so that admins can manage paths for it.
    """
    env_bucket = env_settings.tf_state_bucket
    if not env_bucket:
        return

    result = await db.execute(
        select(TerraformStateBucket).where(
            TerraformStateBucket.bucket_name == env_bucket,
            TerraformStateBucket.source == "env",
        )
    )
    if result.scalar_one_or_none() is None:
        bucket = TerraformStateBucket(
            bucket_name=env_bucket,
            description="Bucket from TF_STATE_BUCKET environment variable",
            enabled=True,
            source="env",
        )
        db.add(bucket)
        await db.commit()


@router.get("/terraform/buckets", response_model=TerraformBucketsListResponse)
async def list_terraform_buckets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """List all configured Terraform state buckets. Admin only."""
    await _ensure_env_bucket(db)

    result = await db.execute(
        select(TerraformStateBucket)
        .options(selectinload(TerraformStateBucket.paths))
        .order_by(TerraformStateBucket.created_at)
    )
    buckets = result.scalars().unique().all()

    return TerraformBucketsListResponse(
        buckets=[TerraformBucketResponse.model_validate(b) for b in buckets],
        total=len(buckets),
    )


@router.post(
    "/terraform/buckets",
    response_model=TerraformBucketResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_terraform_bucket(
    data: TerraformBucketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Add a new Terraform state bucket configuration. Admin only."""
    bucket = TerraformStateBucket(
        bucket_name=data.bucket_name,
        region=data.region,
        description=data.description,
        prefix=data.prefix,
        enabled=data.enabled,
    )
    db.add(bucket)
    await db.commit()
    await db.refresh(bucket, attribute_names=["paths"])
    logger.info(
        f"User {current_user.username} added terraform bucket: {data.bucket_name}"
    )
    return TerraformBucketResponse.model_validate(bucket)


@router.put("/terraform/buckets/{bucket_id}", response_model=TerraformBucketResponse)
async def update_terraform_bucket(
    bucket_id: int,
    data: TerraformBucketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a Terraform state bucket configuration. Admin only."""
    result = await db.execute(
        select(TerraformStateBucket)
        .options(selectinload(TerraformStateBucket.paths))
        .where(TerraformStateBucket.id == bucket_id)
    )
    bucket = result.scalar_one_or_none()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terraform bucket with id {bucket_id} not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bucket, field, value)

    await db.commit()
    await db.refresh(bucket, attribute_names=["paths"])
    logger.info(f"User {current_user.username} updated terraform bucket {bucket_id}")
    return TerraformBucketResponse.model_validate(bucket)


@router.delete("/terraform/buckets/{bucket_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_terraform_bucket(
    bucket_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Remove a Terraform state bucket configuration. Admin only."""
    result = await db.execute(
        select(TerraformStateBucket).where(TerraformStateBucket.id == bucket_id)
    )
    bucket = result.scalar_one_or_none()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terraform bucket with id {bucket_id} not found",
        )

    await db.delete(bucket)
    await db.commit()
    logger.info(
        f"User {current_user.username} deleted terraform bucket {bucket_id} "
        f"({bucket.bucket_name})"
    )


# =============================================================================
# Terraform State Path Management
# =============================================================================


@router.post(
    "/terraform/buckets/{bucket_id}/paths",
    response_model=TerraformPathResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_terraform_path(
    bucket_id: int,
    data: TerraformPathCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Add a state file path to a bucket. Admin only."""
    result = await db.execute(
        select(TerraformStateBucket).where(TerraformStateBucket.id == bucket_id)
    )
    bucket = result.scalar_one_or_none()
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terraform bucket with id {bucket_id} not found",
        )

    path = TerraformStatePath(
        bucket_id=bucket_id,
        path=data.path,
        description=data.description,
        enabled=data.enabled,
    )
    db.add(path)
    await db.commit()
    await db.refresh(path)
    logger.info(
        f"User {current_user.username} added path '{data.path}' "
        f"to bucket {bucket.bucket_name}"
    )
    return TerraformPathResponse.model_validate(path)


@router.put(
    "/terraform/paths/{path_id}",
    response_model=TerraformPathResponse,
)
async def update_terraform_path(
    path_id: int,
    data: TerraformPathUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update a state file path. Admin only."""
    result = await db.execute(
        select(TerraformStatePath).where(TerraformStatePath.id == path_id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terraform path with id {path_id} not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(path, field, value)

    await db.commit()
    await db.refresh(path)
    logger.info(f"User {current_user.username} updated terraform path {path_id}")
    return TerraformPathResponse.model_validate(path)


@router.delete(
    "/terraform/paths/{path_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_terraform_path(
    path_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Remove a state file path. Admin only."""
    result = await db.execute(
        select(TerraformStatePath).where(TerraformStatePath.id == path_id)
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Terraform path with id {path_id} not found",
        )

    await db.delete(path)
    await db.commit()
    logger.info(
        f"User {current_user.username} deleted terraform path {path_id} "
        f"({path.path})"
    )
