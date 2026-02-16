"""
EC2 instance endpoints.

Provides CRUD-like operations for EC2 instance data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import EC2Instance, Region
from app.schemas.resources import (
    DisplayStatus,
    EC2InstanceDetail,
    EC2InstanceResponse,
    PaginatedResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


EC2_SORT_COLUMNS = {
    "name": EC2Instance.name,
    "state": EC2Instance.state,
    "instance_type": EC2Instance.instance_type,
    "launch_time": EC2Instance.launch_time,
    "instance_id": EC2Instance.instance_id,
}


@router.get("/ec2", response_model=PaginatedResponse[EC2InstanceResponse])
async def list_ec2_instances(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or instance ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    tag: Optional[str] = Query(None, description="Filter by tag (format: key:value)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort by field name"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    db: AsyncSession = Depends(get_db),
):
    """
    List EC2 instances with filtering, pagination, and sorting.
    """
    # Build base filter conditions
    conditions = [EC2Instance.is_deleted == False]

    if status:
        states = _get_states_for_status(status)
        conditions.append(EC2Instance.state.in_(states))

    if search:
        search_term = f"%{search}%"
        conditions.append(
            (EC2Instance.name.ilike(search_term))
            | (EC2Instance.instance_id.ilike(search_term))
        )

    if tf_managed is not None:
        conditions.append(EC2Instance.tf_managed == tf_managed)

    if tag:
        conditions.append(EC2Instance.tags.contains(tag))

    # Count query
    count_query = select(func.count(EC2Instance.id)).where(*conditions)
    if region:
        count_query = count_query.join(Region).where(Region.name == region)
    total = (await db.execute(count_query)).scalar_one()

    # Data query
    query = (
        select(EC2Instance).options(joinedload(EC2Instance.region)).where(*conditions)
    )

    if region:
        query = query.join(Region).where(Region.name == region)

    # Sorting
    sort_col = EC2_SORT_COLUMNS.get(sort_by) if sort_by else None
    if sort_col is not None:
        query = query.order_by(
            sort_col.desc() if sort_order == "desc" else sort_col.asc()
        )
    else:
        query = query.order_by(EC2Instance.name, EC2Instance.instance_id)

    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    instances = result.scalars().unique().all()

    response_data = [_instance_to_response(instance) for instance in instances]

    return PaginatedResponse(
        data=response_data,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/ec2/{instance_id}", response_model=EC2InstanceDetail)
async def get_ec2_instance(
    instance_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific EC2 instance.

    Args:
        instance_id: The EC2 instance ID (e.g., i-0abc123def456)

    Returns:
        Detailed EC2 instance information

    Raises:
        404: If instance not found
    """
    query = (
        select(EC2Instance)
        .options(joinedload(EC2Instance.region))
        .where(EC2Instance.instance_id == instance_id)
    )
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(
            status_code=404, detail=f"EC2 instance not found: {instance_id}"
        )

    return _instance_to_detail(instance)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to EC2 states."""
    mapping = {
        DisplayStatus.ACTIVE: ["running"],
        DisplayStatus.INACTIVE: ["stopped"],
        DisplayStatus.TRANSITIONING: ["pending", "stopping", "shutting-down"],
        DisplayStatus.ERROR: ["terminated"],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _instance_to_response(instance: EC2Instance) -> EC2InstanceResponse:
    """Convert EC2Instance model to response schema."""
    tags = None
    if instance.tags:
        try:
            tags = json.loads(instance.tags)
        except json.JSONDecodeError:
            tags = {}

    return EC2InstanceResponse(
        id=instance.id,
        instance_id=instance.instance_id,
        name=instance.name,
        instance_type=instance.instance_type,
        state=instance.state,
        display_status=DisplayStatus(instance.display_status),
        private_ip=instance.private_ip,
        public_ip=instance.public_ip,
        private_dns=instance.private_dns,
        public_dns=instance.public_dns,
        vpc_id=instance.vpc_id,
        subnet_id=instance.subnet_id,
        availability_zone=instance.availability_zone,
        launch_time=instance.launch_time,
        tags=tags,
        tf_managed=instance.tf_managed,
        tf_state_source=instance.tf_state_source,
        tf_resource_address=instance.tf_resource_address,
        region_name=instance.region.name if instance.region else None,
        is_deleted=instance.is_deleted,
        deleted_at=instance.deleted_at,
        updated_at=instance.updated_at,
    )


def _instance_to_detail(instance: EC2Instance) -> EC2InstanceDetail:
    """Convert EC2Instance model to detailed response schema."""
    tags = None
    if instance.tags:
        try:
            tags = json.loads(instance.tags)
        except json.JSONDecodeError:
            tags = {}

    return EC2InstanceDetail(
        id=instance.id,
        instance_id=instance.instance_id,
        name=instance.name,
        instance_type=instance.instance_type,
        state=instance.state,
        display_status=DisplayStatus(instance.display_status),
        private_ip=instance.private_ip,
        public_ip=instance.public_ip,
        private_dns=instance.private_dns,
        public_dns=instance.public_dns,
        vpc_id=instance.vpc_id,
        subnet_id=instance.subnet_id,
        availability_zone=instance.availability_zone,
        launch_time=instance.launch_time,
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
