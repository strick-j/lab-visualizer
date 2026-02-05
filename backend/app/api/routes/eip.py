"""
Elastic IP endpoints.

Provides CRUD-like operations for Elastic IP data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import ElasticIP, Region
from app.schemas.resources import (
    DisplayStatus,
    ElasticIPDetail,
    ElasticIPResponse,
    ListResponse,
    MetaInfo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/elastic-ips", response_model=ListResponse[ElasticIPResponse])
async def list_elastic_ips(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(
        None, description="Search by name, allocation ID, or public IP"
    ),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    instance_id: Optional[str] = Query(
        None, description="Filter by associated instance ID"
    ),
    associated: Optional[bool] = Query(
        None, description="Filter by association status"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    List all Elastic IPs with optional filtering.

    Args:
        status: Filter by display status (active, inactive)
        region: Filter by AWS region name
        search: Search term for name, allocation ID, or public IP
        tf_managed: Filter by Terraform managed status
        instance_id: Filter by associated instance ID
        associated: Filter by association status (True=associated, False=unassociated)

    Returns:
        List of Elastic IPs matching the filters
    """
    # Build query - exclude deleted instances by default
    query = (
        select(ElasticIP)
        .options(joinedload(ElasticIP.region))
        .where(ElasticIP.is_deleted == False)
    )

    # Apply filters
    if status:
        # EIPs don't have explicit states, filter by association status
        if status == DisplayStatus.ACTIVE:
            query = query.where(ElasticIP.association_id.isnot(None))
        elif status == DisplayStatus.INACTIVE:
            query = query.where(ElasticIP.association_id.is_(None))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (ElasticIP.name.ilike(search_term))
            | (ElasticIP.allocation_id.ilike(search_term))
            | (ElasticIP.public_ip.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(ElasticIP.tf_managed == tf_managed)

    if instance_id:
        query = query.where(ElasticIP.instance_id == instance_id)

    if associated is not None:
        if associated:
            query = query.where(ElasticIP.association_id.isnot(None))
        else:
            query = query.where(ElasticIP.association_id.is_(None))

    # Execute query
    result = await db.execute(query.order_by(ElasticIP.name, ElasticIP.public_ip))
    elastic_ips = result.scalars().unique().all()

    # Convert to response format
    response_data = [_elastic_ip_to_response(eip) for eip in elastic_ips]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/elastic-ips/{allocation_id}", response_model=ElasticIPDetail)
async def get_elastic_ip(
    allocation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific Elastic IP.

    Args:
        allocation_id: The Elastic IP allocation ID (e.g., eipalloc-0abc123def456)

    Returns:
        Detailed Elastic IP information

    Raises:
        404: If Elastic IP not found
    """
    query = (
        select(ElasticIP)
        .options(joinedload(ElasticIP.region))
        .where(ElasticIP.allocation_id == allocation_id)
    )
    result = await db.execute(query)
    eip = result.scalar_one_or_none()

    if not eip:
        raise HTTPException(
            status_code=404, detail=f"Elastic IP not found: {allocation_id}"
        )

    return _elastic_ip_to_detail(eip)


def _elastic_ip_to_response(eip: ElasticIP) -> ElasticIPResponse:
    """Convert Elastic IP model to response schema."""
    tags = None
    if eip.tags:
        try:
            tags = json.loads(eip.tags)
        except json.JSONDecodeError:
            tags = {}

    return ElasticIPResponse(
        id=eip.id,
        allocation_id=eip.allocation_id,
        name=eip.name,
        public_ip=eip.public_ip,
        private_ip=eip.private_ip,
        domain=eip.domain,
        display_status=DisplayStatus(eip.display_status),
        association_id=eip.association_id,
        instance_id=eip.instance_id,
        network_interface_id=eip.network_interface_id,
        tags=tags,
        tf_managed=eip.tf_managed,
        tf_state_source=eip.tf_state_source,
        tf_resource_address=eip.tf_resource_address,
        region_name=eip.region.name if eip.region else None,
        is_deleted=eip.is_deleted,
        deleted_at=eip.deleted_at,
        updated_at=eip.updated_at,
    )


def _elastic_ip_to_detail(eip: ElasticIP) -> ElasticIPDetail:
    """Convert Elastic IP model to detailed response schema."""
    tags = None
    if eip.tags:
        try:
            tags = json.loads(eip.tags)
        except json.JSONDecodeError:
            tags = {}

    return ElasticIPDetail(
        id=eip.id,
        allocation_id=eip.allocation_id,
        name=eip.name,
        public_ip=eip.public_ip,
        private_ip=eip.private_ip,
        domain=eip.domain,
        display_status=DisplayStatus(eip.display_status),
        association_id=eip.association_id,
        instance_id=eip.instance_id,
        network_interface_id=eip.network_interface_id,
        tags=tags,
        tf_managed=eip.tf_managed,
        tf_state_source=eip.tf_state_source,
        tf_resource_address=eip.tf_resource_address,
        region_name=eip.region.name if eip.region else None,
        is_deleted=eip.is_deleted,
        deleted_at=eip.deleted_at,
        created_at=eip.created_at,
        updated_at=eip.updated_at,
    )
