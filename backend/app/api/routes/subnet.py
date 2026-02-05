"""
Subnet endpoints.

Provides CRUD-like operations for Subnet data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import Region, Subnet
from app.schemas.resources import (
    DisplayStatus,
    ListResponse,
    MetaInfo,
    SubnetDetail,
    SubnetResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/subnets", response_model=ListResponse[SubnetResponse])
async def list_subnets(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or Subnet ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    vpc_id: Optional[str] = Query(None, description="Filter by VPC ID"),
    subnet_type: Optional[str] = Query(
        None, description="Filter by subnet type (public/private/unknown)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    List all Subnets with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or Subnet ID
        tf_managed: Filter by Terraform managed status
        vpc_id: Filter by VPC ID
        subnet_type: Filter by subnet type

    Returns:
        List of Subnets matching the filters
    """
    # Build query - exclude deleted instances by default
    query = (
        select(Subnet)
        .options(joinedload(Subnet.region))
        .where(Subnet.is_deleted == False)
    )

    # Apply filters
    if status:
        states = _get_states_for_status(status)
        query = query.where(Subnet.state.in_(states))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (Subnet.name.ilike(search_term)) | (Subnet.subnet_id.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(Subnet.tf_managed == tf_managed)

    if vpc_id:
        query = query.where(Subnet.vpc_id == vpc_id)

    if subnet_type:
        query = query.where(Subnet.subnet_type == subnet_type)

    # Execute query
    result = await db.execute(query.order_by(Subnet.name, Subnet.subnet_id))
    subnets = result.scalars().unique().all()

    # Convert to response format
    response_data = [_subnet_to_response(subnet) for subnet in subnets]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/subnets/{subnet_id}", response_model=SubnetDetail)
async def get_subnet(
    subnet_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific Subnet.

    Args:
        subnet_id: The Subnet ID (e.g., subnet-0abc123def456)

    Returns:
        Detailed Subnet information

    Raises:
        404: If Subnet not found
    """
    query = (
        select(Subnet)
        .options(joinedload(Subnet.region))
        .where(Subnet.subnet_id == subnet_id)
    )
    result = await db.execute(query)
    subnet = result.scalar_one_or_none()

    if not subnet:
        raise HTTPException(status_code=404, detail=f"Subnet not found: {subnet_id}")

    return _subnet_to_detail(subnet)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to Subnet states."""
    mapping = {
        DisplayStatus.ACTIVE: ["available"],
        DisplayStatus.INACTIVE: [],
        DisplayStatus.TRANSITIONING: ["pending"],
        DisplayStatus.ERROR: [],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _subnet_to_response(subnet: Subnet) -> SubnetResponse:
    """Convert Subnet model to response schema."""
    tags = None
    if subnet.tags:
        try:
            tags = json.loads(subnet.tags)
        except json.JSONDecodeError:
            tags = {}

    return SubnetResponse(
        id=subnet.id,
        subnet_id=subnet.subnet_id,
        name=subnet.name,
        vpc_id=subnet.vpc_id,
        cidr_block=subnet.cidr_block,
        availability_zone=subnet.availability_zone,
        subnet_type=subnet.subnet_type,
        state=subnet.state,
        display_status=DisplayStatus(subnet.display_status),
        available_ip_count=subnet.available_ip_count,
        map_public_ip_on_launch=subnet.map_public_ip_on_launch,
        tags=tags,
        tf_managed=subnet.tf_managed,
        tf_state_source=subnet.tf_state_source,
        tf_resource_address=subnet.tf_resource_address,
        region_name=subnet.region.name if subnet.region else None,
        is_deleted=subnet.is_deleted,
        deleted_at=subnet.deleted_at,
        updated_at=subnet.updated_at,
    )


def _subnet_to_detail(subnet: Subnet) -> SubnetDetail:
    """Convert Subnet model to detailed response schema."""
    tags = None
    if subnet.tags:
        try:
            tags = json.loads(subnet.tags)
        except json.JSONDecodeError:
            tags = {}

    return SubnetDetail(
        id=subnet.id,
        subnet_id=subnet.subnet_id,
        name=subnet.name,
        vpc_id=subnet.vpc_id,
        cidr_block=subnet.cidr_block,
        availability_zone=subnet.availability_zone,
        subnet_type=subnet.subnet_type,
        state=subnet.state,
        display_status=DisplayStatus(subnet.display_status),
        available_ip_count=subnet.available_ip_count,
        map_public_ip_on_launch=subnet.map_public_ip_on_launch,
        tags=tags,
        tf_managed=subnet.tf_managed,
        tf_state_source=subnet.tf_state_source,
        tf_resource_address=subnet.tf_resource_address,
        region_name=subnet.region.name if subnet.region else None,
        is_deleted=subnet.is_deleted,
        deleted_at=subnet.deleted_at,
        created_at=subnet.created_at,
        updated_at=subnet.updated_at,
    )
