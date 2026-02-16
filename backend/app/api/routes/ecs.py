"""
ECS container endpoints.

Provides CRUD-like operations for ECS container (task) data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.database import get_db
from app.models.resources import ECSContainer, Region
from app.schemas.resources import (
    DisplayStatus,
    ECSClusterSummary,
    ECSContainerDetail,
    ECSContainerResponse,
    ECSSummaryResponse,
    ListResponse,
    ManagedBy,
    MetaInfo,
    PaginatedResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


ECS_SORT_COLUMNS = {
    "name": ECSContainer.name,
    "status": ECSContainer.status,
    "cluster_name": ECSContainer.cluster_name,
    "launch_type": ECSContainer.launch_type,
}


@router.get(
    "/ecs/clusters",
    response_model=ListResponse[ECSClusterSummary],
)
async def list_ecs_clusters(
    region: Optional[str] = Query(None, description="Filter by AWS region"),
    search: Optional[str] = Query(None, description="Search by cluster name"),
    tf_managed: Optional[bool] = Query(None, description="Filter by Terraform managed"),
    db: AsyncSession = Depends(get_db),
):
    """
    List ECS clusters with summary info and their containers.

    Clusters are derived from the containers' cluster_name field.
    Each cluster includes its containers nested inside.
    """
    query = (
        select(ECSContainer)
        .options(joinedload(ECSContainer.region))
        .where(ECSContainer.is_deleted == False)
    )

    if region:
        query = query.join(Region).where(Region.name == region)

    if search:
        search_term = f"%{search}%"
        query = query.where(ECSContainer.cluster_name.ilike(search_term))

    if tf_managed is not None:
        query = query.where(ECSContainer.tf_managed == tf_managed)

    query = query.order_by(
        ECSContainer.cluster_name,
        ECSContainer.name,
        ECSContainer.task_id,
    )
    result = await db.execute(query)
    containers = result.scalars().unique().all()

    # Group containers by cluster_name
    cluster_map: dict[str, list[ECSContainer]] = {}
    for container in containers:
        cluster_map.setdefault(container.cluster_name, []).append(container)

    # Build cluster summaries
    cluster_summaries = []
    for name, cluster_containers in sorted(cluster_map.items()):
        running = sum(1 for c in cluster_containers if c.status == "RUNNING")
        stopped = sum(1 for c in cluster_containers if c.status == "STOPPED")
        pending = sum(
            1
            for c in cluster_containers
            if c.status in ("PENDING", "PROVISIONING", "ACTIVATING")
        )
        any_tf = any(c.tf_managed for c in cluster_containers)
        region_name = (
            cluster_containers[0].region.name if cluster_containers[0].region else None
        )

        # Determine cluster-level managed_by
        if any_tf:
            cluster_managed_by = ManagedBy.TERRAFORM
        else:
            cluster_managed_by = ManagedBy.UNMANAGED

        container_responses = [_container_to_response(c) for c in cluster_containers]

        cluster_summaries.append(
            ECSClusterSummary(
                cluster_name=name,
                total_tasks=len(cluster_containers),
                running_tasks=running,
                stopped_tasks=stopped,
                pending_tasks=pending,
                tf_managed=any_tf,
                managed_by=cluster_managed_by,
                region_name=region_name,
                containers=container_responses,
            )
        )

    return ListResponse(
        data=cluster_summaries,
        meta=MetaInfo(total=len(cluster_summaries)),
    )


@router.get("/ecs", response_model=PaginatedResponse[ECSContainerResponse])
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
    tag: Optional[str] = Query(None, description="Filter by tag (format: key:value)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    sort_by: Optional[str] = Query(None, description="Sort by field name"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="Sort order"),
    db: AsyncSession = Depends(get_db),
):
    """
    List all ECS containers with optional filtering, pagination, and sorting.

    Args:
        status: Filter by display status (active, inactive, transitioning, error)
        region: Filter by AWS region name
        search: Search term for name or task ID
        cluster_name: Filter by ECS cluster name
        launch_type: Filter by launch type
        tf_managed: Filter by Terraform managed status
        tag: Filter by tag (format: key:value)
        page: Page number (1-based)
        page_size: Items per page (1-200, default 50)
        sort_by: Sort by field name (name, status, cluster_name, launch_type)
        sort_order: Sort order (asc or desc)

    Returns:
        Paginated list of ECS containers matching the filters
    """
    # Build base filter conditions
    conditions = [ECSContainer.is_deleted == False]

    if status:
        statuses = _get_statuses_for_display(status)
        conditions.append(ECSContainer.status.in_(statuses))

    if search:
        search_term = f"%{search}%"
        conditions.append(
            (ECSContainer.name.ilike(search_term))
            | (ECSContainer.task_id.ilike(search_term))
            | (ECSContainer.cluster_name.ilike(search_term))
        )

    if cluster_name:
        conditions.append(ECSContainer.cluster_name == cluster_name)

    if launch_type:
        conditions.append(ECSContainer.launch_type == launch_type.upper())

    if tf_managed is not None:
        conditions.append(ECSContainer.tf_managed == tf_managed)

    if tag:
        conditions.append(ECSContainer.tags.contains(tag))

    # Count query
    count_query = select(func.count(ECSContainer.id)).where(*conditions)
    if region:
        count_query = count_query.join(Region).where(Region.name == region)
    total = (await db.execute(count_query)).scalar_one()

    # Data query
    query = (
        select(ECSContainer).options(joinedload(ECSContainer.region)).where(*conditions)
    )

    if region:
        query = query.join(Region).where(Region.name == region)

    # Sorting
    sort_col = ECS_SORT_COLUMNS.get(sort_by) if sort_by else None
    if sort_col is not None:
        query = query.order_by(
            sort_col.desc() if sort_order == "desc" else sort_col.asc()
        )
    else:
        query = query.order_by(
            ECSContainer.cluster_name, ECSContainer.name, ECSContainer.task_id
        )

    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)

    # Execute query
    result = await db.execute(query)
    containers = result.scalars().unique().all()

    # Convert to response format
    response_data = [_container_to_response(container) for container in containers]

    return PaginatedResponse(
        data=response_data,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
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


@router.get("/ecs/summary", response_model=ECSSummaryResponse)
async def get_ecs_summary(
    db: AsyncSession = Depends(get_db),
):
    """
    Get summary counts for ECS resources.

    Returns cluster count, running/stopped/pending task counts.
    """
    query = select(ECSContainer).where(ECSContainer.is_deleted == False)
    result = await db.execute(query)
    containers = result.scalars().all()

    cluster_names = set()
    running = 0
    stopped = 0
    pending = 0

    for c in containers:
        cluster_names.add(c.cluster_name)
        if c.status == "RUNNING":
            running += 1
        elif c.status == "STOPPED":
            stopped += 1
        elif c.status in ("PENDING", "PROVISIONING", "ACTIVATING"):
            pending += 1

    return ECSSummaryResponse(
        clusters=len(cluster_names),
        services=0,
        running_tasks=running,
        stopped_tasks=stopped,
        pending_tasks=pending,
        total_tasks=len(containers),
    )


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


def _resolve_managed_by(container: ECSContainer) -> ManagedBy:
    """Resolve the management source for a container."""
    if container.tf_managed:
        return ManagedBy.TERRAFORM
    managed = getattr(container, "managed_by", "unmanaged")
    if managed == "github_actions":
        return ManagedBy.GITHUB_ACTIONS
    if managed == "terraform":
        return ManagedBy.TERRAFORM
    return ManagedBy.UNMANAGED


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
        image_tag=getattr(container, "image_tag", None),
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
        managed_by=_resolve_managed_by(container),
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
        image_tag=getattr(container, "image_tag", None),
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
        managed_by=_resolve_managed_by(container),
        region_name=container.region.name if container.region else None,
        is_deleted=container.is_deleted,
        deleted_at=container.deleted_at,
        created_at=container.created_at,
        updated_at=container.updated_at,
    )
