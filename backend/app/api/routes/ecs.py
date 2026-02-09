"""
ECS cluster and service endpoints.

Provides operations for ECS cluster and service data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import ECSCluster, ECSService, Region
from app.schemas.resources import (
    DisplayStatus,
    ECSClusterDetail,
    ECSClusterResponse,
    ECSServiceResponse,
    ListResponse,
    MetaInfo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/ecs", response_model=ListResponse[ECSClusterResponse])
async def list_ecs_clusters(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or cluster name"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all ECS clusters with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or cluster name
        tf_managed: Filter by Terraform managed status

    Returns:
        List of ECS clusters matching the filters
    """
    # Build query - exclude deleted clusters by default
    query = (
        select(ECSCluster)
        .options(joinedload(ECSCluster.region), joinedload(ECSCluster.services))
        .where(ECSCluster.is_deleted == False)
    )

    # Apply filters
    if status:
        states = _get_states_for_status(status)
        query = query.where(ECSCluster.status.in_(states))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (ECSCluster.name.ilike(search_term))
            | (ECSCluster.cluster_name.ilike(search_term))
        )

    if tf_managed is not None:
        query = query.where(ECSCluster.tf_managed == tf_managed)

    # Execute query
    result = await db.execute(
        query.order_by(ECSCluster.cluster_name)
    )
    clusters = result.scalars().unique().all()

    # Convert to response format
    response_data = [_cluster_to_response(cluster) for cluster in clusters]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/ecs/{cluster_arn:path}", response_model=ECSClusterDetail)
async def get_ecs_cluster(
    cluster_arn: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific ECS cluster.

    Args:
        cluster_arn: The ECS cluster ARN

    Returns:
        Detailed ECS cluster information

    Raises:
        404: If cluster not found
    """
    query = (
        select(ECSCluster)
        .options(joinedload(ECSCluster.region), joinedload(ECSCluster.services))
        .where(ECSCluster.cluster_arn == cluster_arn)
    )
    result = await db.execute(query)
    cluster = result.scalars().unique().one_or_none()

    if not cluster:
        raise HTTPException(
            status_code=404, detail=f"ECS cluster not found: {cluster_arn}"
        )

    return _cluster_to_detail(cluster)


def _get_states_for_status(status: DisplayStatus) -> list[str]:
    """Map display status to ECS cluster states."""
    mapping = {
        DisplayStatus.ACTIVE: ["ACTIVE"],
        DisplayStatus.INACTIVE: ["INACTIVE"],
        DisplayStatus.TRANSITIONING: ["PROVISIONING", "DEPROVISIONING"],
        DisplayStatus.ERROR: ["FAILED"],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _service_to_response(service: ECSService) -> ECSServiceResponse:
    """Convert ECSService model to response schema."""
    tags = None
    if service.tags:
        try:
            tags = json.loads(service.tags)
        except json.JSONDecodeError:
            tags = {}

    subnet_ids = None
    if service.subnet_ids:
        try:
            subnet_ids = json.loads(service.subnet_ids)
        except json.JSONDecodeError:
            subnet_ids = []

    security_groups = None
    if service.security_groups:
        try:
            security_groups = json.loads(service.security_groups)
        except json.JSONDecodeError:
            security_groups = []

    return ECSServiceResponse(
        id=service.id,
        service_arn=service.service_arn,
        service_name=service.service_name,
        status=service.status,
        display_status=DisplayStatus(service.display_status),
        desired_count=service.desired_count,
        running_count=service.running_count,
        pending_count=service.pending_count,
        launch_type=service.launch_type,
        task_definition=service.task_definition,
        subnet_ids=subnet_ids,
        security_groups=security_groups,
        tags=tags,
        tf_managed=service.tf_managed,
        tf_state_source=service.tf_state_source,
        tf_resource_address=service.tf_resource_address,
        is_deleted=service.is_deleted,
        deleted_at=service.deleted_at,
        updated_at=service.updated_at,
    )


def _cluster_to_response(cluster: ECSCluster) -> ECSClusterResponse:
    """Convert ECSCluster model to response schema."""
    tags = None
    if cluster.tags:
        try:
            tags = json.loads(cluster.tags)
        except json.JSONDecodeError:
            tags = {}

    services = [
        _service_to_response(s) for s in cluster.services if not s.is_deleted
    ]

    return ECSClusterResponse(
        id=cluster.id,
        cluster_arn=cluster.cluster_arn,
        cluster_name=cluster.cluster_name,
        name=cluster.name,
        status=cluster.status,
        display_status=DisplayStatus(cluster.display_status),
        registered_container_instances_count=cluster.registered_container_instances_count,
        running_tasks_count=cluster.running_tasks_count,
        pending_tasks_count=cluster.pending_tasks_count,
        active_services_count=cluster.active_services_count,
        tags=tags,
        tf_managed=cluster.tf_managed,
        tf_state_source=cluster.tf_state_source,
        tf_resource_address=cluster.tf_resource_address,
        region_name=cluster.region.name if cluster.region else None,
        is_deleted=cluster.is_deleted,
        deleted_at=cluster.deleted_at,
        updated_at=cluster.updated_at,
        services=services,
    )


def _cluster_to_detail(cluster: ECSCluster) -> ECSClusterDetail:
    """Convert ECSCluster model to detailed response schema."""
    tags = None
    if cluster.tags:
        try:
            tags = json.loads(cluster.tags)
        except json.JSONDecodeError:
            tags = {}

    services = [
        _service_to_response(s) for s in cluster.services if not s.is_deleted
    ]

    return ECSClusterDetail(
        id=cluster.id,
        cluster_arn=cluster.cluster_arn,
        cluster_name=cluster.cluster_name,
        name=cluster.name,
        status=cluster.status,
        display_status=DisplayStatus(cluster.display_status),
        registered_container_instances_count=cluster.registered_container_instances_count,
        running_tasks_count=cluster.running_tasks_count,
        pending_tasks_count=cluster.pending_tasks_count,
        active_services_count=cluster.active_services_count,
        tags=tags,
        tf_managed=cluster.tf_managed,
        tf_state_source=cluster.tf_state_source,
        tf_resource_address=cluster.tf_resource_address,
        region_name=cluster.region.name if cluster.region else None,
        is_deleted=cluster.is_deleted,
        deleted_at=cluster.deleted_at,
        created_at=cluster.created_at,
        updated_at=cluster.updated_at,
        services=services,
    )
