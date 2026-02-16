"""
S3 bucket endpoints.

Provides CRUD-like operations for S3 bucket data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import Region, S3Bucket
from app.schemas.resources import (
    DisplayStatus,
    ListResponse,
    MetaInfo,
    S3BucketDetail,
    S3BucketResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/s3-buckets", response_model=ListResponse[S3BucketResponse])
async def list_s3_buckets(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(
        None, description="Search by bucket name or Name tag"
    ),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all S3 buckets with optional filtering.

    Args:
        status: Filter by display status (active, inactive)
        region: Filter by AWS region name
        search: Search term for bucket name or Name tag
        tf_managed: Filter by Terraform managed status

    Returns:
        List of S3 buckets matching the filters
    """
    # Build query - exclude deleted buckets by default
    query = (
        select(S3Bucket)
        .options(joinedload(S3Bucket.region))
        .where(S3Bucket.is_deleted == False)
    )

    # Apply filters
    if status:
        # S3 buckets are always active if they exist
        if status == DisplayStatus.ACTIVE:
            pass  # All non-deleted buckets are active
        elif status in (DisplayStatus.INACTIVE, DisplayStatus.ERROR):
            # No S3 buckets match these statuses
            return ListResponse(data=[], meta=MetaInfo(total=0))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (S3Bucket.bucket_name.ilike(search_term))
            | (S3Bucket.name.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(S3Bucket.tf_managed == tf_managed)

    # Execute query
    result = await db.execute(query.order_by(S3Bucket.bucket_name))
    buckets = result.scalars().unique().all()

    # Convert to response format
    response_data = [_s3_bucket_to_response(bucket) for bucket in buckets]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/s3-buckets/{bucket_name}", response_model=S3BucketDetail)
async def get_s3_bucket(
    bucket_name: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific S3 bucket.

    Args:
        bucket_name: The S3 bucket name

    Returns:
        Detailed S3 bucket information

    Raises:
        404: If S3 bucket not found
    """
    query = (
        select(S3Bucket)
        .options(joinedload(S3Bucket.region))
        .where(S3Bucket.bucket_name == bucket_name)
    )
    result = await db.execute(query)
    bucket = result.scalar_one_or_none()

    if not bucket:
        raise HTTPException(
            status_code=404, detail=f"S3 bucket not found: {bucket_name}"
        )

    return _s3_bucket_to_detail(bucket)


def _s3_bucket_to_response(bucket: S3Bucket) -> S3BucketResponse:
    """Convert S3 bucket model to response schema."""
    tags = None
    if bucket.tags:
        try:
            tags = json.loads(bucket.tags)
        except json.JSONDecodeError:
            tags = {}

    return S3BucketResponse(
        id=bucket.id,
        bucket_name=bucket.bucket_name,
        name=bucket.name,
        creation_date=bucket.creation_date,
        display_status=DisplayStatus(bucket.display_status),
        versioning_enabled=bucket.versioning_enabled,
        mfa_delete=bucket.mfa_delete,
        encryption_algorithm=bucket.encryption_algorithm,
        kms_key_id=bucket.kms_key_id,
        bucket_key_enabled=bucket.bucket_key_enabled,
        block_public_acls=bucket.block_public_acls,
        block_public_policy=bucket.block_public_policy,
        ignore_public_acls=bucket.ignore_public_acls,
        restrict_public_buckets=bucket.restrict_public_buckets,
        tags=tags,
        tf_managed=bucket.tf_managed,
        tf_state_source=bucket.tf_state_source,
        tf_resource_address=bucket.tf_resource_address,
        region_name=bucket.region.name if bucket.region else None,
        is_deleted=bucket.is_deleted,
        deleted_at=bucket.deleted_at,
        updated_at=bucket.updated_at,
    )


def _s3_bucket_to_detail(bucket: S3Bucket) -> S3BucketDetail:
    """Convert S3 bucket model to detailed response schema."""
    tags = None
    if bucket.tags:
        try:
            tags = json.loads(bucket.tags)
        except json.JSONDecodeError:
            tags = {}

    return S3BucketDetail(
        id=bucket.id,
        bucket_name=bucket.bucket_name,
        name=bucket.name,
        creation_date=bucket.creation_date,
        display_status=DisplayStatus(bucket.display_status),
        versioning_enabled=bucket.versioning_enabled,
        mfa_delete=bucket.mfa_delete,
        encryption_algorithm=bucket.encryption_algorithm,
        kms_key_id=bucket.kms_key_id,
        bucket_key_enabled=bucket.bucket_key_enabled,
        block_public_acls=bucket.block_public_acls,
        block_public_policy=bucket.block_public_policy,
        ignore_public_acls=bucket.ignore_public_acls,
        restrict_public_buckets=bucket.restrict_public_buckets,
        policy=bucket.policy,
        tags=tags,
        tf_managed=bucket.tf_managed,
        tf_state_source=bucket.tf_state_source,
        tf_resource_address=bucket.tf_resource_address,
        region_name=bucket.region.name if bucket.region else None,
        is_deleted=bucket.is_deleted,
        deleted_at=bucket.deleted_at,
        created_at=bucket.created_at,
        updated_at=bucket.updated_at,
    )
