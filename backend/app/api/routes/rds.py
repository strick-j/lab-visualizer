"""
RDS instance endpoints.

Provides CRUD-like operations for RDS instance data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import RDSInstance, Region
from app.schemas.resources import (
    DisplayStatus,
    ListResponse,
    MetaInfo,
    RDSInstanceDetail,
    RDSInstanceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/rds", response_model=ListResponse[RDSInstanceResponse])
async def list_rds_instances(
    status: Optional[DisplayStatus] = Query(None, description="Filter by display status"),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or identifier"),
    engine: Optional[str] = Query(None, description="Filter by database engine"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all RDS instances with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or DB identifier
        engine: Filter by database engine (e.g., postgres, mysql)
        tf_managed: Filter by Terraform managed status

    Returns:
        List of RDS instances matching the filters
    """
    # Build query - exclude deleted instances by default
    query = select(RDSInstance).options(joinedload(RDSInstance.region)).where(
        RDSInstance.is_deleted == False
    )

    # Apply filters
    if status:
        statuses = _get_statuses_for_display(status)
        query = query.where(RDSInstance.status.in_(statuses))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (RDSInstance.name.ilike(search_term))
            | (RDSInstance.db_instance_identifier.ilike(search_term))
        )

    if engine:
        query = query.where(RDSInstance.engine == engine)

    if tf_managed is not None:
        query = query.where(RDSInstance.tf_managed == tf_managed)

    # Execute query
    result = await db.execute(
        query.order_by(RDSInstance.name, RDSInstance.db_instance_identifier)
    )
    instances = result.scalars().unique().all()

    # Convert to response format
    response_data = [_instance_to_response(instance) for instance in instances]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/rds/{db_identifier}", response_model=RDSInstanceDetail)
async def get_rds_instance(
    db_identifier: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific RDS instance.

    Args:
        db_identifier: The RDS DB instance identifier

    Returns:
        Detailed RDS instance information

    Raises:
        404: If instance not found
    """
    query = (
        select(RDSInstance)
        .options(joinedload(RDSInstance.region))
        .where(RDSInstance.db_instance_identifier == db_identifier)
    )
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(
            status_code=404, detail=f"RDS instance not found: {db_identifier}"
        )

    return _instance_to_detail(instance)


def _get_statuses_for_display(status: DisplayStatus) -> list[str]:
    """Map display status to RDS statuses."""
    mapping = {
        DisplayStatus.ACTIVE: ["available"],
        DisplayStatus.INACTIVE: ["stopped"],
        DisplayStatus.TRANSITIONING: ["starting", "stopping", "creating", "deleting"],
        DisplayStatus.ERROR: ["failed", "incompatible-restore", "incompatible-parameters"],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _instance_to_response(instance: RDSInstance) -> RDSInstanceResponse:
    """Convert RDSInstance model to response schema."""
    tags = None
    if instance.tags:
        try:
            tags = json.loads(instance.tags)
        except json.JSONDecodeError:
            tags = {}

    return RDSInstanceResponse(
        id=instance.id,
        db_instance_identifier=instance.db_instance_identifier,
        name=instance.name,
        db_instance_class=instance.db_instance_class,
        status=instance.status,
        display_status=DisplayStatus(instance.display_status),
        engine=instance.engine,
        engine_version=instance.engine_version,
        allocated_storage=instance.allocated_storage,
        endpoint=instance.endpoint,
        port=instance.port,
        vpc_id=instance.vpc_id,
        availability_zone=instance.availability_zone,
        multi_az=instance.multi_az,
        tags=tags,
        tf_managed=instance.tf_managed,
        tf_state_source=instance.tf_state_source,
        tf_resource_address=instance.tf_resource_address,
        region_name=instance.region.name if instance.region else None,
        is_deleted=instance.is_deleted,
        deleted_at=instance.deleted_at,
        updated_at=instance.updated_at,
    )


def _instance_to_detail(instance: RDSInstance) -> RDSInstanceDetail:
    """Convert RDSInstance model to detailed response schema."""
    tags = None
    if instance.tags:
        try:
            tags = json.loads(instance.tags)
        except json.JSONDecodeError:
            tags = {}

    return RDSInstanceDetail(
        id=instance.id,
        db_instance_identifier=instance.db_instance_identifier,
        name=instance.name,
        db_instance_class=instance.db_instance_class,
        status=instance.status,
        display_status=DisplayStatus(instance.display_status),
        engine=instance.engine,
        engine_version=instance.engine_version,
        allocated_storage=instance.allocated_storage,
        endpoint=instance.endpoint,
        port=instance.port,
        vpc_id=instance.vpc_id,
        availability_zone=instance.availability_zone,
        multi_az=instance.multi_az,
        tags=tags,
        tf_managed=instance.tf_managed,
        tf_state_source=instance.tf_state_source,
        tf_resource_address=instance.tf_resource_address,
        region_name=instance.region.name if instance.region else None,
        is_deleted=instance.is_deleted,
        deleted_at=instance.deleted_at,
        created_at=instance.created_at,
        updated_at=instance.updated_at,
    )
