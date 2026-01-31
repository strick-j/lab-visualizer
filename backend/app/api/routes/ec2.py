"""
EC2 instance endpoints.

Provides CRUD-like operations for EC2 instance data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import EC2Instance, Region
from app.schemas.resources import (
    DisplayStatus,
    EC2InstanceDetail,
    EC2InstanceResponse,
    ListResponse,
    MetaInfo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/ec2", response_model=ListResponse[EC2InstanceResponse])
async def list_ec2_instances(
    status: Optional[DisplayStatus] = Query(None, description="Filter by display status"),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or instance ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all EC2 instances with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or instance ID
        tf_managed: Filter by Terraform managed status

    Returns:
        List of EC2 instances matching the filters
    """
    # Build query - exclude deleted instances by default
    query = select(EC2Instance).options(joinedload(EC2Instance.region)).where(
        EC2Instance.is_deleted == False
    )

    # Apply filters
    if status:
        states = _get_states_for_status(status)
        query = query.where(EC2Instance.state.in_(states))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (EC2Instance.name.ilike(search_term))
            | (EC2Instance.instance_id.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(EC2Instance.tf_managed == tf_managed)

    # Execute query
    result = await db.execute(query.order_by(EC2Instance.name, EC2Instance.instance_id))
    instances = result.scalars().unique().all()

    # Convert to response format
    response_data = [_instance_to_response(instance) for instance in instances]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
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
        raise HTTPException(status_code=404, detail=f"EC2 instance not found: {instance_id}")

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
