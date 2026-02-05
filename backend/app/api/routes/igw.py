"""
Internet Gateway endpoints.

Provides CRUD-like operations for Internet Gateway data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import InternetGateway, Region
from app.schemas.resources import (
    DisplayStatus,
    InternetGatewayDetail,
    InternetGatewayResponse,
    ListResponse,
    MetaInfo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/internet-gateways", response_model=ListResponse[InternetGatewayResponse])
async def list_internet_gateways(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or IGW ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    vpc_id: Optional[str] = Query(None, description="Filter by VPC ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all Internet Gateways with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or IGW ID
        tf_managed: Filter by Terraform managed status
        vpc_id: Filter by VPC ID

    Returns:
        List of Internet Gateways matching the filters
    """
    # Build query - exclude deleted instances by default
    query = (
        select(InternetGateway)
        .options(joinedload(InternetGateway.region))
        .where(InternetGateway.is_deleted == False)
    )

    # Apply filters
    if status:
        states = _get_states_for_status(status)
        query = query.where(InternetGateway.state.in_(states))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (InternetGateway.name.ilike(search_term))
            | (InternetGateway.igw_id.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(InternetGateway.tf_managed == tf_managed)

    if vpc_id:
        query = query.where(InternetGateway.vpc_id == vpc_id)

    # Execute query
    result = await db.execute(
        query.order_by(InternetGateway.name, InternetGateway.igw_id)
    )
    igws = result.scalars().unique().all()

    # Convert to response format
    response_data = [_igw_to_response(igw) for igw in igws]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/internet-gateways/{igw_id}", response_model=InternetGatewayDetail)
async def get_internet_gateway(
    igw_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific Internet Gateway.

    Args:
        igw_id: The Internet Gateway ID (e.g., igw-0abc123def456)

    Returns:
        Detailed Internet Gateway information

    Raises:
        404: If Internet Gateway not found
    """
    query = (
        select(InternetGateway)
        .options(joinedload(InternetGateway.region))
        .where(InternetGateway.igw_id == igw_id)
    )
    result = await db.execute(query)
    igw = result.scalar_one_or_none()

    if not igw:
        raise HTTPException(
            status_code=404, detail=f"Internet Gateway not found: {igw_id}"
        )

    return _igw_to_detail(igw)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to Internet Gateway states."""
    mapping = {
        DisplayStatus.ACTIVE: ["available", "attached"],
        DisplayStatus.INACTIVE: ["detached"],
        DisplayStatus.TRANSITIONING: ["detaching"],
        DisplayStatus.ERROR: [],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _igw_to_response(igw: InternetGateway) -> InternetGatewayResponse:
    """Convert InternetGateway model to response schema."""
    tags = None
    if igw.tags:
        try:
            tags = json.loads(igw.tags)
        except json.JSONDecodeError:
            tags = {}

    return InternetGatewayResponse(
        id=igw.id,
        igw_id=igw.igw_id,
        name=igw.name,
        vpc_id=igw.vpc_id,
        state=igw.state,
        display_status=DisplayStatus(igw.display_status),
        tags=tags,
        tf_managed=igw.tf_managed,
        tf_state_source=igw.tf_state_source,
        tf_resource_address=igw.tf_resource_address,
        region_name=igw.region.name if igw.region else None,
        is_deleted=igw.is_deleted,
        deleted_at=igw.deleted_at,
        updated_at=igw.updated_at,
    )


def _igw_to_detail(igw: InternetGateway) -> InternetGatewayDetail:
    """Convert InternetGateway model to detailed response schema."""
    tags = None
    if igw.tags:
        try:
            tags = json.loads(igw.tags)
        except json.JSONDecodeError:
            tags = {}

    return InternetGatewayDetail(
        id=igw.id,
        igw_id=igw.igw_id,
        name=igw.name,
        vpc_id=igw.vpc_id,
        state=igw.state,
        display_status=DisplayStatus(igw.display_status),
        tags=tags,
        tf_managed=igw.tf_managed,
        tf_state_source=igw.tf_state_source,
        tf_resource_address=igw.tf_resource_address,
        region_name=igw.region.name if igw.region else None,
        is_deleted=igw.is_deleted,
        deleted_at=igw.deleted_at,
        created_at=igw.created_at,
        updated_at=igw.updated_at,
    )
