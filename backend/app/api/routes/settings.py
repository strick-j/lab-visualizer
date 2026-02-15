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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin_user
from app.config import get_settings
from app.models.auth import User
from app.models.cyberark import (
    CyberArkAccount,
    CyberArkRole,
    CyberArkSafe,
    CyberArkSettings,
    CyberArkSIAPolicy,
    CyberArkUser,
)
from app.models.database import get_db
from app.models.resources import SyncStatus, TerraformStateBucket, TerraformStatePath
from app.schemas.cyberark import (
    CyberArkConnectionTestRequest,
    CyberArkConnectionTestResponse,
    CyberArkSettingsResponse,
    CyberArkSettingsUpdate,
    ScimConnectionTestRequest,
    ScimConnectionTestResponse,
    ScimSettingsResponse,
    ScimSettingsUpdate,
    TenantDiscoveryRequest,
    TenantDiscoveryResponse,
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


def _validate_url_for_ssrf(url: str) -> None:
    """
    Validate a URL is safe from SSRF attacks.

    Enforces HTTPS, rejects IP-literal hostnames, resolves DNS and rejects
    private/internal addresses, and validates hostname format.

    Raises HTTPException if validation fails.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format",
        )

    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must use HTTPS with a valid hostname",
        )

    hostname = parsed.hostname

    # Reject raw IP addresses used as hostnames
    try:
        ipaddress.ip_address(hostname)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must use a domain name, not an IP address",
        )
    except ValueError:
        pass  # Not an IP literal — expected for domain names

    # Validate hostname format: only valid domain name characters
    if not re.fullmatch(
        r"[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*",
        hostname,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL hostname contains invalid characters",
        )

    # Resolve the hostname and reject private / internal IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
    except OSError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to resolve hostname",
        )

    if not addr_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hostname did not resolve to any address",
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
                detail="URL must not resolve to a private or internal IP address",
            )


# Regex for allowed URL path characters (RFC 3986 pchar + "/" separator)
_SAFE_PATH_RE = re.compile(r"(/[A-Za-z0-9._~:@!$&'()*+,;=-]*)*")


def _build_safe_url(url: str, append_path: str = "") -> str:
    """
    Reconstruct a URL from validated, IDNA-encoded components.

    Parses the URL, encodes the hostname through IDNA (which converts
    through bytes, breaking static-analysis taint propagation), validates
    the path contains only safe characters, and returns a reconstructed URL.

    Must be called AFTER ``_validate_url_for_ssrf`` has confirmed the URL
    is safe.

    Raises HTTPException if component sanitisation fails.
    """
    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    # Encode hostname through IDNA to produce a sanitised ASCII value.
    # The bytes round-trip creates a genuinely new string, breaking
    # CodeQL's taint propagation from the original user input.
    try:
        safe_hostname: str = hostname.encode("idna").decode("ascii")
    except (UnicodeError, UnicodeDecodeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hostname is not a valid domain name",
        )

    port_suffix = f":{parsed.port}" if parsed.port and parsed.port != 443 else ""
    base_path = parsed.path.rstrip("/") if parsed.path else ""

    # Validate path contains only safe URL characters
    if base_path and not _SAFE_PATH_RE.fullmatch(base_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL path contains invalid characters",
        )

    safe_append = append_path.rstrip("/") if append_path else ""
    return f"https://{safe_hostname}{port_suffix}{base_path}{safe_append}"


def _validate_issuer_and_build_discovery_url(issuer_input: str) -> str:
    """
    Validate the OIDC issuer and return a safely-constructed discovery URL.

    Combines SSRF validation with URL reconstruction to produce a safe
    ``/.well-known/openid-configuration`` URL.
    """
    stripped = issuer_input.strip().rstrip("/")
    _validate_url_for_ssrf(stripped)
    return _build_safe_url(stripped, "/.well-known/openid-configuration")


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
        tenant_name=env_settings.cyberark_tenant_name,
        enabled=env_settings.cyberark_enabled,
        base_url=env_settings.cyberark_base_url,
        identity_url=env_settings.cyberark_identity_url,
        uap_base_url=env_settings.cyberark_uap_base_url,
        client_id=env_settings.cyberark_client_id,
        client_secret=env_settings.cyberark_client_secret,
        scim_enabled=env_settings.cyberark_scim_enabled,
        scim_app_id=env_settings.cyberark_scim_app_id,
        scim_scope=env_settings.cyberark_scim_scope,
        scim_client_id=env_settings.cyberark_scim_client_id,
        scim_client_secret=env_settings.cyberark_scim_client_secret,
    )
    # Auto-derive scim_oauth2_url if both identity_url and scim_app_id are set
    if settings.identity_url and settings.scim_app_id:
        identity_base = settings.identity_url.rstrip("/")
        settings.scim_oauth2_url = (
            f"{identity_base}/oauth2/token/{settings.scim_app_id}"
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
        tenant_name=settings.tenant_name,
        enabled=settings.enabled,
        base_url=settings.base_url,
        identity_url=settings.identity_url,
        uap_base_url=settings.uap_base_url,
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
        tenant_name=settings.tenant_name,
        enabled=settings.enabled,
        base_url=settings.base_url,
        identity_url=settings.identity_url,
        uap_base_url=settings.uap_base_url,
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
    _validate_url_for_ssrf(identity_url)
    token_url = _build_safe_url(identity_url, "/oauth2/platformtoken")

    # Resolve the client secret: prefer the one in the request, fall back to DB
    secret = test_data.client_secret
    if not secret:
        db_settings = await _get_or_create_cyberark_settings(db)
        secret = db_settings.client_secret
    if not secret:
        return CyberArkConnectionTestResponse(
            success=False,
            message="No client secret provided or saved",
        )

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
                    "client_secret": secret,
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
                "scope": data.get("scope", ""),
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


@router.post("/cyberark/discover", response_model=TenantDiscoveryResponse)
async def discover_cyberark_tenant(
    request: TenantDiscoveryRequest,
    current_user: User = Depends(get_current_admin_user),
):
    """Discover CyberArk tenant URLs from subdomain name. Admin only."""
    subdomain = request.subdomain.strip().lower()
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", subdomain):
        return TenantDiscoveryResponse(
            success=False,
            message="Invalid subdomain format",
        )

    discovery_url = (
        f"https://platform-discovery.cyberark.cloud"
        f"/api/v2/services/subdomain/{subdomain}"
    )
    logger.info(
        "User %s discovering CyberArk tenant: %s",
        current_user.username,
        subdomain,
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(discovery_url)
            response.raise_for_status()
            data = response.json()

        pcloud = data.get("pcloud", {})
        identity = data.get("identity_administration", {})
        uap = data.get("uap", {})

        base_url = pcloud.get("api", "").rstrip("/")
        identity_url = identity.get("api", "").rstrip("/")
        uap_base_url = uap.get("api", "").rstrip("/")
        region = pcloud.get("region", "")

        if not base_url or not identity_url:
            return TenantDiscoveryResponse(
                success=False,
                message="Discovery succeeded but missing expected URLs in response",
            )

        return TenantDiscoveryResponse(
            success=True,
            base_url=base_url,
            identity_url=identity_url,
            uap_base_url=uap_base_url or None,
            region=region,
        )

    except httpx.HTTPStatusError as e:
        logger.warning(
            "CyberArk tenant discovery HTTP %s for subdomain %s",
            e.response.status_code,
            subdomain,
        )
        return TenantDiscoveryResponse(
            success=False,
            message=f"Tenant not found (HTTP {e.response.status_code})",
        )
    except httpx.RequestError:
        logger.warning("CyberArk tenant discovery request error", exc_info=True)
        return TenantDiscoveryResponse(
            success=False,
            message="Could not connect to CyberArk platform discovery service",
        )
    except Exception:
        logger.exception("Unexpected error during tenant discovery")
        return TenantDiscoveryResponse(
            success=False,
            message="An unexpected error occurred during tenant discovery",
        )


@router.get("/cyberark/status")
async def get_cyberark_sync_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Diagnostic endpoint: report CyberArk config state and DB row counts. Admin only."""
    # Check settings
    result = await db.execute(select(CyberArkSettings).limit(1))
    db_settings = result.scalar_one_or_none()

    config_source = "none"
    config_ok = False
    if db_settings and db_settings.enabled:
        config_source = "database"
        config_ok = all(
            [
                db_settings.base_url,
                db_settings.identity_url,
                db_settings.client_id,
                db_settings.client_secret,
            ]
        )
    elif env_settings.cyberark_enabled:
        config_source = "environment"
        config_ok = all(
            [
                env_settings.cyberark_base_url,
                env_settings.cyberark_identity_url,
                env_settings.cyberark_client_id,
                env_settings.cyberark_client_secret,
            ]
        )

    # Row counts
    roles_total = (await db.execute(select(func.count(CyberArkRole.id)))).scalar_one()
    roles_active = (
        await db.execute(
            select(func.count(CyberArkRole.id)).where(
                CyberArkRole.is_deleted == False  # noqa: E712
            )
        )
    ).scalar_one()
    safes_total = (await db.execute(select(func.count(CyberArkSafe.id)))).scalar_one()
    accounts_total = (
        await db.execute(select(func.count(CyberArkAccount.id)))
    ).scalar_one()
    policies_total = (
        await db.execute(select(func.count(CyberArkSIAPolicy.id)))
    ).scalar_one()

    # Last sync time
    sync_result = await db.execute(
        select(SyncStatus).where(SyncStatus.source == "cyberark")
    )
    sync_row = sync_result.scalar_one_or_none()

    return {
        "config": {
            "source": config_source,
            "enabled": config_source != "none",
            "all_fields_set": config_ok,
            "db_settings_exists": db_settings is not None,
            "db_enabled": db_settings.enabled if db_settings else None,
            "db_base_url_set": bool(db_settings.base_url) if db_settings else False,
            "db_identity_url_set": (
                bool(db_settings.identity_url) if db_settings else False
            ),
            "db_client_id_set": bool(db_settings.client_id) if db_settings else False,
            "db_client_secret_set": (
                bool(db_settings.client_secret) if db_settings else False
            ),
        },
        "database_counts": {
            "roles_total": roles_total,
            "roles_active": roles_active,
            "safes": safes_total,
            "accounts": accounts_total,
            "sia_policies": policies_total,
            "users": (
                await db.execute(select(func.count(CyberArkUser.id)))
            ).scalar_one(),
        },
        "last_sync": {
            "synced_at": sync_row.last_synced_at.isoformat() if sync_row else None,
            "status": sync_row.status if sync_row else None,
            "resource_count": sync_row.resource_count if sync_row else None,
        },
    }


# =============================================================================
# SCIM Settings Management
# =============================================================================


@router.get("/cyberark/scim", response_model=ScimSettingsResponse)
async def get_scim_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Get SCIM integration settings. Admin only."""
    settings = await _get_or_create_cyberark_settings(db)

    return ScimSettingsResponse(
        scim_enabled=settings.scim_enabled,
        scim_app_id=settings.scim_app_id,
        scim_oauth2_url=settings.scim_oauth2_url,
        scim_scope=settings.scim_scope,
        scim_client_id=settings.scim_client_id,
        has_scim_client_secret=bool(settings.scim_client_secret),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.put("/cyberark/scim", response_model=ScimSettingsResponse)
async def update_scim_settings(
    update_data: ScimSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Update SCIM integration settings. Admin only."""
    settings = await _get_or_create_cyberark_settings(db)

    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(settings, field, value)

    # Auto-derive scim_oauth2_url from identity_url + scim_app_id
    if settings.scim_app_id and settings.identity_url:
        identity_base = settings.identity_url.rstrip("/")
        settings.scim_oauth2_url = (
            f"{identity_base}/oauth2/token/{settings.scim_app_id}"
        )

    settings.updated_by = current_user.username

    await db.commit()
    await db.refresh(settings)
    logger.info(
        "User %s updated SCIM settings (scim_enabled=%s)",
        current_user.username,
        settings.scim_enabled,
    )

    return ScimSettingsResponse(
        scim_enabled=settings.scim_enabled,
        scim_app_id=settings.scim_app_id,
        scim_oauth2_url=settings.scim_oauth2_url,
        scim_scope=settings.scim_scope,
        scim_client_id=settings.scim_client_id,
        has_scim_client_secret=bool(settings.scim_client_secret),
        updated_at=settings.updated_at,
        updated_by=settings.updated_by,
    )


@router.post("/cyberark/scim/test", response_model=ScimConnectionTestResponse)
async def test_scim_connection(
    test_data: ScimConnectionTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Test SCIM OAuth2 connection by acquiring a token. Admin only."""
    # Derive OAuth2 URL from app_id + identity_url if no explicit URL given
    if test_data.scim_oauth2_url:
        oauth2_url = test_data.scim_oauth2_url.strip().rstrip("/")
    elif test_data.scim_app_id:
        db_settings = await _get_or_create_cyberark_settings(db)
        identity_base = (db_settings.identity_url or "").rstrip("/")
        if not identity_base:
            return ScimConnectionTestResponse(
                success=False,
                message=(
                    "Cannot derive SCIM OAuth2 URL: "
                    "Identity URL not configured. Save platform settings first."
                ),
            )
        oauth2_url = f"{identity_base}/oauth2/token/{test_data.scim_app_id.strip()}"
    else:
        db_settings = await _get_or_create_cyberark_settings(db)
        if db_settings.scim_oauth2_url:
            oauth2_url = db_settings.scim_oauth2_url.strip().rstrip("/")
        else:
            return ScimConnectionTestResponse(
                success=False,
                message="No SCIM App ID or OAuth2 URL provided",
            )

    # Validate SSRF safety before making outbound request
    _validate_url_for_ssrf(oauth2_url)
    oauth2_url = _build_safe_url(oauth2_url)

    # Resolve the client secret: prefer the one in the request, fall back to DB
    scim_secret = test_data.scim_client_secret
    if not scim_secret:
        db_settings = await _get_or_create_cyberark_settings(db)
        scim_secret = db_settings.scim_client_secret
    if not scim_secret:
        return ScimConnectionTestResponse(
            success=False,
            message="No SCIM client secret provided or saved",
        )

    logger.info(
        "User %s testing SCIM connection to %s",
        current_user.username,
        _sanitize_for_log(oauth2_url),
    )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                oauth2_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": test_data.scim_client_id,
                    "client_secret": scim_secret,
                    "scope": test_data.scim_scope,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()

        return ScimConnectionTestResponse(
            success=True,
            message="Successfully authenticated for SCIM",
            details={
                "token_type": data.get("token_type", ""),
                "scope": data.get("scope", ""),
                "expires_in": data.get("expires_in", 0),
            },
        )

    except httpx.HTTPStatusError as e:
        logger.warning(
            "SCIM test connection HTTP %s — body: %s",
            e.response.status_code,
            e.response.text[:500],
        )
        detail_msg = "Authentication failed"
        try:
            err_body = e.response.json()
            if "error_description" in err_body:
                detail_msg = err_body["error_description"]
            elif "error" in err_body:
                detail_msg = err_body["error"]
        except Exception:
            detail_msg = e.response.text[:200] or detail_msg
        return ScimConnectionTestResponse(
            success=False,
            message=f"Authentication failed: {detail_msg}",
        )
    except httpx.RequestError:
        logger.warning("SCIM test connection request error", exc_info=True)
        return ScimConnectionTestResponse(
            success=False,
            message="Could not connect to SCIM OAuth2 endpoint",
        )
    except Exception:
        logger.exception("Unexpected error testing SCIM connection")
        return ScimConnectionTestResponse(
            success=False,
            message="An unexpected error occurred while testing the connection",
        )
