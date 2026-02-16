"""
VPC endpoints.

Provides CRUD-like operations for VPC data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import VPC, Region
from app.schemas.resources import (
    DisplayStatus,
    PaginatedResponse,
    VPCDetail,
    VPCResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


VPC_SORT_COLUMNS = {
    "name": VPC.name,
    "state": VPC.state,
    "vpc_id": VPC.vpc_id,
    "cidr_block": VPC.cidr_block,
}


@router.get("/vpcs", response_model=PaginatedResponse[VPCResponse])
async def list_vpcs(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or VPC ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    tag: Optional[str] = Query(None, description="Filter by tag (format: key:value)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort by field name"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all VPCs with optional filtering, pagination, and sorting.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or VPC ID
        tf_managed: Filter by Terraform managed status
        tag: Filter by tag (format: key:value)
        page: Page number (1-based)
        page_size: Items per page (1-200, default 50)
        sort_by: Sort by field name (name, state, vpc_id, cidr_block)
        sort_order: Sort order (asc or desc)

    Returns:
        Paginated list of VPCs matching the filters
    """
    # Build base filter conditions
    conditions = [VPC.is_deleted == False]

    if status:
        states = _get_states_for_status(status)
        conditions.append(VPC.state.in_(states))

    if search:
        search_term = f"%{search}%"
        conditions.append(
            (VPC.name.ilike(search_term)) | (VPC.vpc_id.ilike(search_term))
        )

    if tf_managed is not None:
        conditions.append(VPC.tf_managed == tf_managed)

    if tag:
        conditions.append(VPC.tags.contains(tag))

    # Count query
    count_query = select(func.count(VPC.id)).where(*conditions)
    if region:
        count_query = count_query.join(Region).where(Region.name == region)
    total = (await db.execute(count_query)).scalar_one()

    # Data query
    query = select(VPC).options(joinedload(VPC.region)).where(*conditions)

    if region:
        query = query.join(Region).where(Region.name == region)

    # Sorting
    sort_col = VPC_SORT_COLUMNS.get(sort_by) if sort_by else None
    if sort_col is not None:
        query = query.order_by(
            sort_col.desc() if sort_order == "desc" else sort_col.asc()
        )
    else:
        query = query.order_by(VPC.name, VPC.vpc_id)

    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)

    # Execute query
    result = await db.execute(query)
    vpcs = result.scalars().unique().all()

    # Convert to response format
    response_data = [_vpc_to_response(vpc) for vpc in vpcs]

    return PaginatedResponse(
        data=response_data,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )


@router.get("/vpcs/{vpc_id}", response_model=VPCDetail)
async def get_vpc(
    vpc_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific VPC.

    Args:
        vpc_id: The VPC ID (e.g., vpc-0abc123def456)

    Returns:
        Detailed VPC information

    Raises:
        404: If VPC not found
    """
    query = select(VPC).options(joinedload(VPC.region)).where(VPC.vpc_id == vpc_id)
    result = await db.execute(query)
    vpc = result.scalar_one_or_none()

    if not vpc:
        raise HTTPException(status_code=404, detail=f"VPC not found: {vpc_id}")

    return _vpc_to_detail(vpc)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to VPC states."""
    mapping = {
        DisplayStatus.ACTIVE: ["available"],
        DisplayStatus.INACTIVE: [],
        DisplayStatus.TRANSITIONING: ["pending"],
        DisplayStatus.ERROR: [],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _vpc_to_response(vpc: VPC) -> VPCResponse:
    """Convert VPC model to response schema."""
    tags = None
    if vpc.tags:
        try:
            tags = json.loads(vpc.tags)
        except json.JSONDecodeError:
            tags = {}

    return VPCResponse(
        id=vpc.id,
        vpc_id=vpc.vpc_id,
        name=vpc.name,
        cidr_block=vpc.cidr_block,
        state=vpc.state,
        is_default=vpc.is_default,
        display_status=DisplayStatus(vpc.display_status),
        enable_dns_support=vpc.enable_dns_support,
        enable_dns_hostnames=vpc.enable_dns_hostnames,
        tags=tags,
        tf_managed=vpc.tf_managed,
        tf_state_source=vpc.tf_state_source,
        tf_resource_address=vpc.tf_resource_address,
        region_name=vpc.region.name if vpc.region else None,
        is_deleted=vpc.is_deleted,
        deleted_at=vpc.deleted_at,
        updated_at=vpc.updated_at,
    )


def _vpc_to_detail(vpc: VPC) -> VPCDetail:
    """Convert VPC model to detailed response schema."""
    tags = None
    if vpc.tags:
        try:
            tags = json.loads(vpc.tags)
        except json.JSONDecodeError:
            tags = {}

    return VPCDetail(
        id=vpc.id,
        vpc_id=vpc.vpc_id,
        name=vpc.name,
        cidr_block=vpc.cidr_block,
        state=vpc.state,
        is_default=vpc.is_default,
        display_status=DisplayStatus(vpc.display_status),
        enable_dns_support=vpc.enable_dns_support,
        enable_dns_hostnames=vpc.enable_dns_hostnames,
        tags=tags,
        tf_managed=vpc.tf_managed,
        tf_state_source=vpc.tf_state_source,
        tf_resource_address=vpc.tf_resource_address,
        region_name=vpc.region.name if vpc.region else None,
        is_deleted=vpc.is_deleted,
        deleted_at=vpc.deleted_at,
        created_at=vpc.created_at,
        updated_at=vpc.updated_at,
    )
