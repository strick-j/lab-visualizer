"""
Combined resources endpoints.

Provides aggregated views of all AWS resources and status summaries.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.collectors.ec2 import EC2Collector
from app.collectors.rds import RDSCollector
from app.config import get_settings
from app.models.database import get_db
from app.models.resources import EC2Instance, RDSInstance, Region, SyncStatus
from app.parsers.terraform import TerraformStateAggregator
from app.schemas.resources import (
    RefreshRequest,
    RefreshResponse,
    ResourceCount,
    StatusSummary,
)

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.get("/status/summary", response_model=StatusSummary)
async def get_status_summary(db: AsyncSession = Depends(get_db)):
    """
    Get aggregated status summary for all resources.

    Returns counts of resources by status (active, inactive, transitioning, error).
    """
    # Get EC2 counts by state
    ec2_counts = await _get_ec2_counts(db)

    # Get RDS counts by status
    rds_counts = await _get_rds_counts(db)

    # Calculate totals
    total_counts = ResourceCount(
        active=ec2_counts.active + rds_counts.active,
        inactive=ec2_counts.inactive + rds_counts.inactive,
        transitioning=ec2_counts.transitioning + rds_counts.transitioning,
        error=ec2_counts.error + rds_counts.error,
        total=ec2_counts.total + rds_counts.total,
    )

    # Get last sync time
    result = await db.execute(
        select(SyncStatus.last_synced_at)
        .where(SyncStatus.source == "aws")
        .order_by(SyncStatus.last_synced_at.desc())
        .limit(1)
    )
    last_refreshed = result.scalar_one_or_none()

    return StatusSummary(
        ec2=ec2_counts,
        rds=rds_counts,
        total=total_counts,
        last_refreshed=last_refreshed,
    )


async def _get_ec2_counts(db: AsyncSession) -> ResourceCount:
    """Get EC2 instance counts by display status, excluding deleted instances."""
    # Map EC2 states to display statuses
    state_mapping = {
        "active": ["running"],
        "inactive": ["stopped"],
        "transitioning": ["pending", "stopping", "shutting-down"],
        "error": ["terminated"],
    }

    counts = {"active": 0, "inactive": 0, "transitioning": 0, "error": 0}

    for display_status, states in state_mapping.items():
        result = await db.execute(
            select(func.count(EC2Instance.id)).where(
                EC2Instance.state.in_(states),
                EC2Instance.is_deleted == False
            )
        )
        counts[display_status] = result.scalar_one()

    total = sum(counts.values())
    return ResourceCount(**counts, total=total)


async def _get_rds_counts(db: AsyncSession) -> ResourceCount:
    """Get RDS instance counts by display status, excluding deleted instances."""
    # Map RDS statuses to display statuses
    status_mapping = {
        "active": ["available"],
        "inactive": ["stopped"],
        "transitioning": ["starting", "stopping", "creating", "deleting"],
        "error": ["failed", "incompatible-restore", "incompatible-parameters"],
    }

    counts = {"active": 0, "inactive": 0, "transitioning": 0, "error": 0}

    for display_status, statuses in status_mapping.items():
        result = await db.execute(
            select(func.count(RDSInstance.id)).where(
                RDSInstance.status.in_(statuses),
                RDSInstance.is_deleted == False
            )
        )
        counts[display_status] = result.scalar_one()

    total = sum(counts.values())
    return ResourceCount(**counts, total=total)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_data(
    request: RefreshRequest = RefreshRequest(),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger a refresh of AWS data.

    Collects fresh data from AWS APIs and Terraform state files,
    then updates the local database.
    """
    start_time = time.time()
    resources_updated = 0

    try:
        logger.info("Starting data refresh...")

        # Ensure default region exists
        region = await _get_or_create_region(db, settings.aws_region)

        # Collect EC2 instances
        ec2_collector = EC2Collector()
        ec2_instances = await ec2_collector.collect()
        ec2_count = await _sync_ec2_instances(db, ec2_instances, region.id)
        resources_updated += ec2_count
        logger.info(f"Synced {ec2_count} EC2 instances")

        # Collect RDS instances
        rds_collector = RDSCollector()
        rds_instances = await rds_collector.collect()
        rds_count = await _sync_rds_instances(db, rds_instances, region.id)
        resources_updated += rds_count
        logger.info(f"Synced {rds_count} RDS instances")

        # Update Terraform managed flags
        tf_count = await _sync_terraform_state(db)
        logger.info(f"Updated Terraform tracking for {tf_count} resources")

        # Update sync status
        await _update_sync_status(db, "aws", resources_updated)

        await db.commit()

        duration = time.time() - start_time
        return RefreshResponse(
            success=True,
            message=f"Successfully refreshed {resources_updated} resources",
            resources_updated=resources_updated,
            duration_seconds=round(duration, 2),
        )

    except Exception as e:
        logger.exception("Error during data refresh")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


async def _get_or_create_region(db: AsyncSession, region_name: str) -> Region:
    """Get or create a region record."""
    result = await db.execute(select(Region).where(Region.name == region_name))
    region = result.scalar_one_or_none()

    if not region:
        region = Region(name=region_name, enabled=True)
        db.add(region)
        await db.flush()

    return region


async def _sync_ec2_instances(
    db: AsyncSession, instances: list, region_id: int
) -> int:
    """Sync EC2 instances to database, marking deleted ones."""
    count = 0

    # Get all existing instance IDs for this region
    result = await db.execute(
        select(EC2Instance.instance_id).where(EC2Instance.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which instances we see from AWS
    seen_ids = set()

    for instance_data in instances:
        instance_id = instance_data["instance_id"]
        seen_ids.add(instance_id)

        # Check if instance exists
        result = await db.execute(
            select(EC2Instance).where(EC2Instance.instance_id == instance_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing instance and mark as not deleted
            existing.name = instance_data.get("name")
            existing.instance_type = instance_data["instance_type"]
            existing.state = instance_data["state"]
            existing.private_ip = instance_data.get("private_ip")
            existing.public_ip = instance_data.get("public_ip")
            existing.vpc_id = instance_data.get("vpc_id")
            existing.subnet_id = instance_data.get("subnet_id")
            existing.availability_zone = instance_data.get("availability_zone")
            existing.launch_time = instance_data.get("launch_time")
            existing.tags = json.dumps(instance_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new instance
            new_instance = EC2Instance(
                instance_id=instance_id,
                region_id=region_id,
                name=instance_data.get("name"),
                instance_type=instance_data["instance_type"],
                state=instance_data["state"],
                private_ip=instance_data.get("private_ip"),
                public_ip=instance_data.get("public_ip"),
                vpc_id=instance_data.get("vpc_id"),
                subnet_id=instance_data.get("subnet_id"),
                availability_zone=instance_data.get("availability_zone"),
                launch_time=instance_data.get("launch_time"),
                tags=json.dumps(instance_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_instance)

        count += 1

    # Mark instances that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(EC2Instance).where(
                EC2Instance.instance_id.in_(deleted_ids),
                EC2Instance.region_id == region_id
            )
        )
        for instance in result.scalars():
            if not instance.is_deleted:
                instance.is_deleted = True
                instance.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked EC2 instance as deleted: {instance.instance_id}")

    await db.flush()
    return count


async def _sync_rds_instances(
    db: AsyncSession, instances: list, region_id: int
) -> int:
    """Sync RDS instances to database, marking deleted ones."""
    count = 0

    # Get all existing instance identifiers for this region
    result = await db.execute(
        select(RDSInstance.db_instance_identifier).where(RDSInstance.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which instances we see from AWS
    seen_ids = set()

    for instance_data in instances:
        db_identifier = instance_data["db_instance_identifier"]
        seen_ids.add(db_identifier)

        # Check if instance exists
        result = await db.execute(
            select(RDSInstance).where(
                RDSInstance.db_instance_identifier == db_identifier
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing instance and mark as not deleted
            existing.name = instance_data.get("name")
            existing.db_instance_class = instance_data["db_instance_class"]
            existing.status = instance_data["status"]
            existing.engine = instance_data["engine"]
            existing.engine_version = instance_data["engine_version"]
            existing.allocated_storage = instance_data["allocated_storage"]
            existing.endpoint = instance_data.get("endpoint")
            existing.port = instance_data.get("port")
            existing.vpc_id = instance_data.get("vpc_id")
            existing.availability_zone = instance_data.get("availability_zone")
            existing.multi_az = instance_data.get("multi_az", False)
            existing.tags = json.dumps(instance_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new instance
            new_instance = RDSInstance(
                db_instance_identifier=db_identifier,
                region_id=region_id,
                name=instance_data.get("name"),
                db_instance_class=instance_data["db_instance_class"],
                status=instance_data["status"],
                engine=instance_data["engine"],
                engine_version=instance_data["engine_version"],
                allocated_storage=instance_data["allocated_storage"],
                endpoint=instance_data.get("endpoint"),
                port=instance_data.get("port"),
                vpc_id=instance_data.get("vpc_id"),
                availability_zone=instance_data.get("availability_zone"),
                multi_az=instance_data.get("multi_az", False),
                tags=json.dumps(instance_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_instance)

        count += 1

    # Mark instances that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(RDSInstance).where(
                RDSInstance.db_instance_identifier.in_(deleted_ids),
                RDSInstance.region_id == region_id
            )
        )
        for instance in result.scalars():
            if not instance.is_deleted:
                instance.is_deleted = True
                instance.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked RDS instance as deleted: {instance.db_instance_identifier}")

    await db.flush()
    return count


async def _sync_terraform_state(db: AsyncSession) -> int:
    """Update Terraform tracking information for resources."""
    if not settings.tf_state_bucket:
        logger.info("No Terraform state bucket configured, skipping TF sync")
        return 0

    try:
        aggregator = TerraformStateAggregator()
        tf_resources = await aggregator.aggregate_all()
        count = 0

        # Update EC2 instances
        for tf_resource in tf_resources.get("ec2", []):
            result = await db.execute(
                select(EC2Instance).where(
                    EC2Instance.instance_id == tf_resource.resource_id
                )
            )
            instance = result.scalar_one_or_none()
            if instance:
                instance.tf_managed = True
                instance.tf_state_source = tf_resource.state_source
                instance.tf_resource_address = tf_resource.resource_address
                count += 1

        # Update RDS instances
        for tf_resource in tf_resources.get("rds", []):
            result = await db.execute(
                select(RDSInstance).where(
                    RDSInstance.db_instance_identifier == tf_resource.resource_id
                )
            )
            instance = result.scalar_one_or_none()
            if instance:
                instance.tf_managed = True
                instance.tf_state_source = tf_resource.state_source
                instance.tf_resource_address = tf_resource.resource_address
                count += 1

        await db.flush()
        return count

    except Exception as e:
        logger.warning(f"Failed to sync Terraform state: {e}")
        return 0


async def _update_sync_status(
    db: AsyncSession, source: str, resource_count: int
) -> None:
    """Update the sync status record."""
    result = await db.execute(select(SyncStatus).where(SyncStatus.source == source))
    sync_status = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if sync_status:
        sync_status.last_synced_at = now
        sync_status.status = "success"
        sync_status.resource_count = resource_count
        sync_status.error_message = None
    else:
        sync_status = SyncStatus(
            source=source,
            last_synced_at=now,
            status="success",
            resource_count=resource_count,
        )
        db.add(sync_status)

    await db.flush()
