"""
ECS container endpoints.

Provides CRUD-like operations for ECS container (task) data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import ECSContainer, Region
from app.schemas.resources import (
    DisplayStatus,
    ECSContainerDetail,
    ECSContainerResponse,
    ListResponse,
    MetaInfo,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/ecs", response_model=ListResponse[ECSContainerResponse])
async def list_ecs_containers(
    status: Optional[DisplayStatus] = Query(
        None, description="Filter by display status"
    ),
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by name or task ID"),
    cluster_name: Optional[str] = Query(None, description="Filter by cluster name"),
    launch_type: Optional[str] = Query(
        None, description="Filter by launch type (FARGATE, EC2, EXTERNAL)"
    ),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all ECS containers with optional filtering.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or task ID
        cluster_name: Filter by ECS cluster name
        launch_type: Filter by launch type
        tf_managed: Filter by Terraform managed status

    Returns:
        List of ECS containers matching the filters
    """
    # Build query - exclude deleted containers by default
    query = (
        select(ECSContainer)
        .options(joinedload(ECSContainer.region))
        .where(ECSContainer.is_deleted == False)
    )

    # Apply filters
    if status:
        statuses = _get_statuses_for_display(status)
        query = query.where(ECSContainer.status.in_(statuses))

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            (ECSContainer.name.ilike(search_term))
            | (ECSContainer.task_id.ilike(search_term))
            | (ECSContainer.cluster_name.ilike(search_term))
        )

    if cluster_name:
        query = query.where(ECSContainer.cluster_name == cluster_name)

    if launch_type:
        query = query.where(ECSContainer.launch_type == launch_type.upper())

    if tf_managed is not None:
        query = query.where(ECSContainer.tf_managed == tf_managed)

    # Execute query
    result = await db.execute(
        query.order_by(ECSContainer.cluster_name, ECSContainer.name, ECSContainer.task_id)
    )
    containers = result.scalars().unique().all()

    # Convert to response format
    response_data = [_container_to_response(container) for container in containers]

    return ListResponse(
        data=response_data,
        meta=MetaInfo(total=len(response_data)),
    )


@router.get("/ecs/{task_id}", response_model=ECSContainerDetail)
async def get_ecs_container(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed information about a specific ECS container.

    Args:
        task_id: The ECS task ID

    Returns:
        Detailed ECS container information

    Raises:
        404: If container not found
    """
    query = (
        select(ECSContainer)
        .options(joinedload(ECSContainer.region))
        .where(ECSContainer.task_id == task_id)
    )
    result = await db.execute(query)
    container = result.scalar_one_or_none()

    if not container:
        raise HTTPException(
            status_code=404, detail=f"ECS container not found: {task_id}"
        )

    return _container_to_detail(container)


def _get_statuses_for_display(status: DisplayStatus) -> list[str]:
    """Map display status to ECS task statuses."""
    mapping = {
        DisplayStatus.ACTIVE: ["RUNNING"],
        DisplayStatus.INACTIVE: ["STOPPED"],
        DisplayStatus.TRANSITIONING: [
            "PROVISIONING",
            "PENDING",
            "ACTIVATING",
            "DEPROVISIONING",
            "STOPPING",
            "DEACTIVATING",
        ],
        DisplayStatus.ERROR: ["DELETED"],
        DisplayStatus.UNKNOWN: [],
    }
    return mapping.get(status, [])


def _container_to_response(container: ECSContainer) -> ECSContainerResponse:
    """Convert ECSContainer model to response schema."""
    tags = None
    if container.tags:
        try:
            tags = json.loads(container.tags)
        except json.JSONDecodeError:
            tags = {}

    return ECSContainerResponse(
        id=container.id,
        task_id=container.task_id,
        name=container.name,
        cluster_name=container.cluster_name,
        launch_type=container.launch_type,
        status=container.status,
        display_status=DisplayStatus(container.display_status),
        cpu=container.cpu,
        memory=container.memory,
        task_definition_arn=container.task_definition_arn,
        desired_status=container.desired_status,
        image=container.image,
        container_port=container.container_port,
        private_ip=container.private_ip,
        subnet_id=container.subnet_id,
        vpc_id=container.vpc_id,
        availability_zone=container.availability_zone,
        started_at=container.started_at,
        tags=tags,
        tf_managed=container.tf_managed,
        tf_state_source=container.tf_state_source,
        tf_resource_address=container.tf_resource_address,
        region_name=container.region.name if container.region else None,
        is_deleted=container.is_deleted,
        deleted_at=container.deleted_at,
        updated_at=container.updated_at,
    )


def _container_to_detail(container: ECSContainer) -> ECSContainerDetail:
    """Convert ECSContainer model to detailed response schema."""
    tags = None
    if container.tags:
        try:
            tags = json.loads(container.tags)
        except json.JSONDecodeError:
            tags = {}

    return ECSContainerDetail(
        id=container.id,
        task_id=container.task_id,
        name=container.name,
        cluster_name=container.cluster_name,
        launch_type=container.launch_type,
        status=container.status,
        display_status=DisplayStatus(container.display_status),
        cpu=container.cpu,
        memory=container.memory,
        task_definition_arn=container.task_definition_arn,
        desired_status=container.desired_status,
        image=container.image,
        container_port=container.container_port,
        private_ip=container.private_ip,
        subnet_id=container.subnet_id,
        vpc_id=container.vpc_id,
        availability_zone=container.availability_zone,
        started_at=container.started_at,
        tags=tags,
        tf_managed=container.tf_managed,
        tf_state_source=container.tf_state_source,
        tf_resource_address=container.tf_resource_address,
        region_name=container.region.name if container.region else None,
        is_deleted=container.is_deleted,
        deleted_at=container.deleted_at,
        created_at=container.created_at,
        updated_at=container.updated_at,
    )
