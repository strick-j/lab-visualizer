"""
NAT Gateway endpoints.

Provides CRUD-like operations for NAT Gateway data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import NATGateway, Region
from app.schemas.resources import (
    DisplayStatus,
    ListResponse,
    MetaInfo,
    NATGatewayDetail,
    NATGatewayResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/nat-gateways", response_model=ListResponse[NATGatewayResponse])
async def list_nat_gateways(
    status: Optional[DisplayStatus] = Query(None, description="Filter by display status"),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or NAT Gateway ID"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    vpc_id: Optional[str] = Query(None, description="Filter by VPC ID"),
    subnet_id: Optional[str] = Query(None, description="Filter by Subnet ID"),
    connectivity_type: Optional[str] = Query(None, description="Filter by connectivity type (public/private)"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all NAT Gateways with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or NAT Gateway ID
        tf_managed: Filter by Terraform managed status
        vpc_id: Filter by VPC ID
        subnet_id: Filter by Subnet ID
        connectivity_type: Filter by connectivity type

    Returns:
        List of NAT Gateways matching the filters
    """
    # Build query - exclude deleted instances by default
    query = select(NATGateway).options(joinedload(NATGateway.region)).where(NATGateway.is_deleted == False)

    # Apply filters
    if status:
        states = _get_states_for_status(status)
        query = query.where(NATGateway.state.in_(states))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (NATGateway.name.ilike(search_term)) | (NATGateway.nat_gateway_id.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(NATGateway.tf_managed == tf_managed)

    if vpc_id:
        query = query.where(NATGateway.vpc_id == vpc_id)

    if subnet_id:
        query = query.where(NATGateway.subnet_id == subnet_id)

    if connectivity_type:
        query = query.where(NATGateway.connectivity_type == connectivity_type)

    # Execute query
    result = await db.execute(query.order_by(NATGateway.name, NATGateway.nat_gateway_id))
    nat_gateways = result.scalars().unique().all()

    # Convert to response format
    response_data = [_nat_gateway_to_response(nat_gw) for nat_gw in nat_gateways]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/nat-gateways/{nat_gateway_id}", response_model=NATGatewayDetail)
async def get_nat_gateway(
    nat_gateway_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific NAT Gateway.

    Args:
        nat_gateway_id: The NAT Gateway ID (e.g., nat-0abc123def456)

    Returns:
        Detailed NAT Gateway information

    Raises:
        404: If NAT Gateway not found
    """
    query = (
        select(NATGateway)
        .options(joinedload(NATGateway.region))
        .where(NATGateway.nat_gateway_id == nat_gateway_id)
    )
    result = await db.execute(query)
    nat_gw = result.scalar_one_or_none()

    if not nat_gw:
        raise HTTPException(status_code=404, detail=f"NAT Gateway not found: {nat_gateway_id}")

    return _nat_gateway_to_detail(nat_gw)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to NAT Gateway states."""
    mapping = {
        DisplayStatus.ACTIVE: ["available"],
        DisplayStatus.INACTIVE: ["deleted"],
        DisplayStatus.TRANSITIONING: ["pending", "deleting"],
        DisplayStatus.ERROR: ["failed"],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _nat_gateway_to_response(nat_gw: NATGateway) -> NATGatewayResponse:
    """Convert NAT Gateway model to response schema."""
    tags = None
    if nat_gw.tags:
        try:
            tags = json.loads(nat_gw.tags)
        except json.JSONDecodeError:
            tags = {}

    return NATGatewayResponse(
        id=nat_gw.id,
        nat_gateway_id=nat_gw.nat_gateway_id,
        name=nat_gw.name,
        vpc_id=nat_gw.vpc_id,
        subnet_id=nat_gw.subnet_id,
        state=nat_gw.state,
        connectivity_type=nat_gw.connectivity_type,
        display_status=DisplayStatus(nat_gw.display_status),
        primary_private_ip=nat_gw.primary_private_ip,
        primary_public_ip=nat_gw.primary_public_ip,
        allocation_id=nat_gw.allocation_id,
        network_interface_id=nat_gw.network_interface_id,
        tags=tags,
        tf_managed=nat_gw.tf_managed,
        tf_state_source=nat_gw.tf_state_source,
        tf_resource_address=nat_gw.tf_resource_address,
        region_name=nat_gw.region.name if nat_gw.region else None,
        is_deleted=nat_gw.is_deleted,
        deleted_at=nat_gw.deleted_at,
        updated_at=nat_gw.updated_at,
    )


def _nat_gateway_to_detail(nat_gw: NATGateway) -> NATGatewayDetail:
    """Convert NAT Gateway model to detailed response schema."""
    tags = None
    if nat_gw.tags:
        try:
            tags = json.loads(nat_gw.tags)
        except json.JSONDecodeError:
            tags = {}

    return NATGatewayDetail(
        id=nat_gw.id,
        nat_gateway_id=nat_gw.nat_gateway_id,
        name=nat_gw.name,
        vpc_id=nat_gw.vpc_id,
        subnet_id=nat_gw.subnet_id,
        state=nat_gw.state,
        connectivity_type=nat_gw.connectivity_type,
        display_status=DisplayStatus(nat_gw.display_status),
        primary_private_ip=nat_gw.primary_private_ip,
        primary_public_ip=nat_gw.primary_public_ip,
        allocation_id=nat_gw.allocation_id,
        network_interface_id=nat_gw.network_interface_id,
        tags=tags,
        tf_managed=nat_gw.tf_managed,
        tf_state_source=nat_gw.tf_state_source,
        tf_resource_address=nat_gw.tf_resource_address,
        region_name=nat_gw.region.name if nat_gw.region else None,
        is_deleted=nat_gw.is_deleted,
        deleted_at=nat_gw.deleted_at,
        created_at=nat_gw.created_at,
        updated_at=nat_gw.updated_at,
    )
