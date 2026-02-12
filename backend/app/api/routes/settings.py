"""
Settings API routes.

Provides admin-only endpoints for managing authentication configuration.
"""

import ipaddress
import logging
import re
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
from app.models.cyberark import CyberArkSettings
from app.models.database import get_db
from app.models.resources import TerraformStateBucket, TerraformStatePath
from app.schemas.cyberark import (
    CyberArkConnectionTestRequest,
    CyberArkConnectionTestResponse,
    CyberArkSettingsResponse,
    CyberArkSettingsUpdate,
)
from app.schemas.settings import (
    AuthSettingsResponse,
    OIDCSettingsResponse,
    OIDCSettingsUpdate,
    S3BucketListRequest,
    S3BucketListResponse,
    S3BucketTestRequest,
    S3BucketTestResponse,
    S3ObjectInfo,
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

# Pattern to strip control characters that could forge log entries
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f-\x9f]")


def _sanitize_for_log(value: str) -> str:
    """Strip control characters from a value before logging."""
    return _CONTROL_CHARS.sub("", value)


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

        async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
            response = await client.get(discovery_url)
            response.raise_for_status()
            config = response.json()

        return TestConnectionResponse(
            success=True,
            message="Successfully connected to OIDC provider",
            details={
                "issuer": config.get("issuer", ""),
            },
        )

    except httpx.HTTPStatusError as e:
        logger.warning("OIDC test connection HTTP error: %s", e.response.status_code)
        return TestConnectionResponse(
            success=False,
            message="OIDC provider returned an error response",
        )
    except httpx.RequestError:
        logger.warning("OIDC test connection request error", exc_info=True)
        return TestConnectionResponse(
            success=False,
            message="Could not connect to OIDC provider",
        )
    except HTTPException:
        raise  # Re-raise validation errors from _validate_issuer_...
    except Exception:
        logger.exception("Unexpected error testing OIDC connection")
        return TestConnectionResponse(
            success=False,
            message="An unexpected error occurred while testing the connection",
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
        "User %s added terraform bucket: %s",
        current_user.username,
        _sanitize_for_log(data.bucket_name),
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
            detail="Terraform bucket not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bucket, field, value)

    await db.commit()
    await db.refresh(bucket)
    logger.info("User %s updated terraform bucket %s", current_user.username, bucket_id)
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
            detail="Terraform bucket not found",
        )

    await db.delete(bucket)
    await db.commit()
    logger.info(
        "User %s deleted terraform bucket %s (%s)",
        current_user.username,
        bucket_id,
        _sanitize_for_log(bucket.bucket_name),
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
            detail="Terraform bucket not found",
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
        "User %s added path '%s' to bucket %s",
        current_user.username,
        _sanitize_for_log(data.path),
        _sanitize_for_log(bucket.bucket_name),
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
            detail="Terraform path not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(path, field, value)

    await db.commit()
    await db.refresh(path)
    logger.info("User %s updated terraform path %s", current_user.username, path_id)
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
            detail="Terraform path not found",
        )

    await db.delete(path)
    await db.commit()
    logger.info(
        "User %s deleted terraform path %s (%s)",
        current_user.username,
        path_id,
        _sanitize_for_log(path.path),
    )


# =============================================================================
# S3 Bucket Test & Browse
# =============================================================================


def _get_s3_client(region: str | None = None):
    """Create an S3 client with the configured AWS profile."""
    import boto3
    from botocore.config import Config

    session_kwargs = {}
    if env_settings.aws_profile:
        session_kwargs["profile_name"] = env_settings.aws_profile

    boto_config = Config(
        retries={"max_attempts": 2, "mode": "adaptive"},
        connect_timeout=5,
        read_timeout=10,
    )

    session = boto3.Session(**session_kwargs)
    return session.client(
        "s3",
        region_name=region or env_settings.aws_region,
        config=boto_config,
    )


@router.post("/terraform/buckets/test", response_model=S3BucketTestResponse)
async def test_s3_bucket(
    data: S3BucketTestRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """Test S3 bucket connectivity and read access. Admin only."""
    from botocore.exceptions import ClientError, NoCredentialsError

    bucket_name = data.bucket_name.strip()
    logger.info(
        "User %s testing S3 bucket: %s",
        current_user.username,
        _sanitize_for_log(bucket_name),
    )

    try:
        s3 = _get_s3_client(data.region)

        # Test 1: Check bucket exists and we have access (HeadBucket)
        s3.head_bucket(Bucket=bucket_name)

        # Test 2: Verify we can list objects (read access)
        list_resp = s3.list_objects_v2(Bucket=bucket_name, MaxKeys=1)
        object_count_sample = list_resp.get("KeyCount", 0)

        # Test 3: Get bucket location for info
        location_resp = s3.get_bucket_location(Bucket=bucket_name)
        location = location_resp.get("LocationConstraint") or "us-east-1"

        return S3BucketTestResponse(
            success=True,
            message="Bucket is accessible and readable",
            details={
                "bucket": bucket_name,
                "region": location,
                "has_objects": str(object_count_sample > 0),
            },
        )

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        if error_code == "404" or error_code == "NoSuchBucket":
            return S3BucketTestResponse(
                success=False,
                message=f"Bucket '{bucket_name}' does not exist",
            )
        elif error_code == "403" or error_code == "AccessDenied":
            return S3BucketTestResponse(
                success=False,
                message="Access denied. Check IAM permissions for s3:HeadBucket and s3:ListBucket.",
            )
        else:
            logger.warning(
                "S3 bucket test failed for %s: [%s] %s",
                _sanitize_for_log(bucket_name),
                error_code,
                e.response.get("Error", {}).get("Message", ""),
            )
            return S3BucketTestResponse(
                success=False,
                message=f"AWS error: {error_code}",
            )
    except NoCredentialsError:
        return S3BucketTestResponse(
            success=False,
            message="No AWS credentials configured. Check AWS configuration.",
        )
    except Exception:
        logger.exception(
            "Unexpected error testing S3 bucket %s", _sanitize_for_log(bucket_name)
        )
        return S3BucketTestResponse(
            success=False,
            message="An unexpected error occurred while testing the bucket",
        )


@router.post("/terraform/buckets/list-objects", response_model=S3BucketListResponse)
async def list_s3_bucket_objects(
    data: S3BucketListRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """List objects and prefixes in an S3 bucket. Admin only.

    Returns up to 100 objects/prefixes at the given prefix level,
    using "/" as the delimiter to simulate folder browsing.
    """
    from botocore.exceptions import ClientError, NoCredentialsError

    bucket_name = data.bucket_name.strip()
    prefix = data.prefix.strip()

    # Ensure prefix ends with "/" if non-empty (for folder-like browsing)
    if prefix and not prefix.endswith("/"):
        prefix += "/"

    try:
        s3 = _get_s3_client(data.region)

        resp = s3.list_objects_v2(
            Bucket=bucket_name,
            Prefix=prefix,
            Delimiter="/",
            MaxKeys=100,
        )

        objects: list[S3ObjectInfo] = []

        # Add "directories" (common prefixes)
        for cp in resp.get("CommonPrefixes", []):
            objects.append(
                S3ObjectInfo(
                    key=cp["Prefix"],
                    is_prefix=True,
                )
            )

        # Add files
        for obj in resp.get("Contents", []):
            key = obj["Key"]
            # Skip the prefix itself if it appears as an object
            if key == prefix:
                continue
            objects.append(
                S3ObjectInfo(
                    key=key,
                    is_prefix=False,
                    size=obj.get("Size"),
                    last_modified=(
                        obj["LastModified"].isoformat()
                        if obj.get("LastModified")
                        else None
                    ),
                )
            )

        return S3BucketListResponse(
            success=True,
            message=f"Found {len(objects)} items",
            objects=objects,
            prefix=prefix,
            bucket_name=bucket_name,
        )

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        logger.warning(
            "S3 list-objects failed for %s: [%s]",
            _sanitize_for_log(bucket_name),
            error_code,
        )
        return S3BucketListResponse(
            success=False,
            message=f"AWS error: {error_code}",
            bucket_name=bucket_name,
            prefix=prefix,
        )
    except NoCredentialsError:
        return S3BucketListResponse(
            success=False,
            message="No AWS credentials configured",
            bucket_name=bucket_name,
            prefix=prefix,
        )
    except Exception:
        logger.exception(
            "Unexpected error listing S3 bucket %s", _sanitize_for_log(bucket_name)
        )
        return S3BucketListResponse(
            success=False,
            message="An unexpected error occurred",
            bucket_name=bucket_name,
            prefix=prefix,
        )


# =============================================================================
# CyberArk Settings Management
# =============================================================================


async def _get_or_create_cyberark_settings(
    db: AsyncSession,
) -> CyberArkSettings:
    """Get existing CyberArk settings or create defaults from env vars."""
    result = await db.execute(select(CyberArkSettings).limit(1))
    settings = result.scalar_one_or_none()
    if settings:
        return settings

    settings = CyberArkSettings(
        enabled=env_settings.cyberark_enabled,
        base_url=env_settings.cyberark_base_url,
        identity_url=env_settings.cyberark_identity_url,
        client_id=env_settings.cyberark_client_id,
        client_secret=env_settings.cyberark_client_secret,
    )
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    return settings


@router.get("/cyberark", response_model=CyberArkSettingsResponse)
async def get_cyberark_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get CyberArk integration settings. Admin only."""
    settings = await _get_or_create_cyberark_settings(db)

    return CyberArkSettingsResponse(
        enabled=settings.enabled,
        base_url=settings.base_url,
        identity_url=settings.identity_url,
        client_id=settings.client_id,
        has_client_secret=bool(settings.client_secret),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.put("/cyberark", response_model=CyberArkSettingsResponse)
async def update_cyberark_settings(
    update_data: CyberArkSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update CyberArk integration settings. Admin only."""
    settings = await _get_or_create_cyberark_settings(db)

    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(settings, field, value)

    settings.updated_by = current_user.username

    await db.commit()
    await db.refresh(settings)
    logger.info(
        "User %s updated CyberArk settings (enabled=%s)",
        current_user.username,
        settings.enabled,
    )

    return CyberArkSettingsResponse(
        enabled=settings.enabled,
        base_url=settings.base_url,
        identity_url=settings.identity_url,
        client_id=settings.client_id,
        has_client_secret=bool(settings.client_secret),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.post("/cyberark/test", response_model=CyberArkConnectionTestResponse)
async def test_cyberark_connection(
    test_data: CyberArkConnectionTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Test CyberArk API connection by authenticating with the identity tenant. Admin only."""
    identity_url = test_data.identity_url.strip().rstrip("/")
    token_url = f"{identity_url}/oauth2/platformtoken"

    logger.info(
        "User %s testing CyberArk connection to %s",
        current_user.username,
        _sanitize_for_log(identity_url),
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": test_data.client_id,
                    "client_secret": test_data.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()

        return CyberArkConnectionTestResponse(
            success=True,
            message="Successfully authenticated with CyberArk Identity",
            details={
                "token_type": data.get("token_type", ""),
                "expires_in": data.get("expires_in", 0),
            },
        )

    except httpx.HTTPStatusError as e:
        logger.warning(
            "CyberArk test connection HTTP error: %s", e.response.status_code
        )
        detail_msg = "Authentication failed"
        try:
            err_body = e.response.json()
            if "error_description" in err_body:
                detail_msg = err_body["error_description"]
            elif "error" in err_body:
                detail_msg = err_body["error"]
        except Exception:
            pass
        return CyberArkConnectionTestResponse(
            success=False,
            message=f"Authentication failed: {detail_msg}",
        )
    except httpx.RequestError:
        logger.warning("CyberArk test connection request error", exc_info=True)
        return CyberArkConnectionTestResponse(
            success=False,
            message="Could not connect to CyberArk Identity tenant",
        )
    except Exception:
        logger.exception("Unexpected error testing CyberArk connection")
        return CyberArkConnectionTestResponse(
            success=False,
            message="An unexpected error occurred while testing the connection",
        )
