"""
Terraform state endpoints.

Provides information about Terraform state files and drift detection.
"""

import logging
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.database import get_db
from app.models.resources import EC2Instance, RDSInstance
from app.parsers.terraform import TerraformStateAggregator
from app.schemas.resources import (
    DriftItem,
    DriftResponse,
    TerraformBucketInfo,
    TerraformStateInfo,
    TerraformStatesResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()
settings = get_settings()


@router.get("/states", response_model=TerraformStatesResponse)
async def list_terraform_states(db: AsyncSession = Depends(get_db)):
    """
    List all configured Terraform state files and their status.

    Returns information about each state file including:
    - Name and description
    - S3 key
    - Last modified timestamp
    - Number of resources in the state
    - Sync status
    """
    try:
        aggregator = TerraformStateAggregator()
        state_files = await aggregator.get_state_info()

        states_info = [
            TerraformStateInfo(
                name=sf.name,
                key=sf.key,
                bucket=TerraformBucketInfo(name=sf.bucket) if sf.bucket else None,
                description=sf.description,
                last_modified=sf.last_modified,
                resource_count=sf.resource_count,
                status=sf.status,
                all_resource_types=sf.all_resource_types or None,
                skipped_resource_count=sf.skipped_resource_count,
            )
            for sf in state_files
        ]

        # Count total TF-managed resources in DB
        ec2_count = await db.execute(
            select(EC2Instance).where(EC2Instance.tf_managed == True)
        )
        rds_count = await db.execute(
            select(RDSInstance).where(RDSInstance.tf_managed == True)
        )
        total_managed = len(ec2_count.scalars().all()) + len(rds_count.scalars().all())

        return TerraformStatesResponse(
            states=states_info,
            total_tf_managed_resources=total_managed,
        )

    except Exception:
        logger.exception("Error fetching Terraform states")
        raise HTTPException(status_code=500, detail="Failed to fetch Terraform states")


@router.get("/drift", response_model=DriftResponse)
async def detect_drift(db: AsyncSession = Depends(get_db)):
    """
    Detect drift between AWS state and Terraform state.

    Compares resources in AWS with resources defined in Terraform state files.
    Identifies:
    - Unmanaged resources: Exist in AWS but not in Terraform
    - Orphaned resources: Defined in Terraform but not found in AWS
    - Modified resources: Exist in both but with different configurations (future)
    """
    drift_items: List[DriftItem] = []

    try:
        # Get Terraform resources
        aggregator = TerraformStateAggregator()
        tf_resources = await aggregator.aggregate_all()

        # Get EC2 resources from TF
        tf_ec2_ids = {r.resource_id for r in tf_resources.get("ec2", [])}
        tf_rds_ids = {r.resource_id for r in tf_resources.get("rds", [])}

        # Get all resources from database
        ec2_result = await db.execute(select(EC2Instance))
        rds_result = await db.execute(select(RDSInstance))

        all_ec2 = ec2_result.scalars().all()
        all_rds = rds_result.scalars().all()

        # Find unmanaged EC2 instances (in AWS but not in TF)
        for instance in all_ec2:
            if instance.instance_id not in tf_ec2_ids:
                drift_items.append(
                    DriftItem(
                        resource_type="aws_instance",
                        resource_id=instance.instance_id,
                        drift_type="unmanaged",
                        details=f"EC2 instance '{instance.name or instance.instance_id}' exists in AWS but is not managed by Terraform",
                    )
                )

        # Find unmanaged RDS instances
        for instance in all_rds:
            if instance.db_instance_identifier not in tf_rds_ids:
                drift_items.append(
                    DriftItem(
                        resource_type="aws_db_instance",
                        resource_id=instance.db_instance_identifier,
                        drift_type="unmanaged",
                        details=f"RDS instance '{instance.name or instance.db_instance_identifier}' exists in AWS but is not managed by Terraform",
                    )
                )

        # Find orphaned EC2 instances (in TF but not in AWS)
        aws_ec2_ids = {i.instance_id for i in all_ec2}
        for tf_resource in tf_resources.get("ec2", []):
            if tf_resource.resource_id not in aws_ec2_ids:
                drift_items.append(
                    DriftItem(
                        resource_type="aws_instance",
                        resource_id=tf_resource.resource_id,
                        drift_type="orphaned",
                        details=f"EC2 instance at '{tf_resource.resource_address}' defined in Terraform but not found in AWS",
                    )
                )

        # Find orphaned RDS instances
        aws_rds_ids = {i.db_instance_identifier for i in all_rds}
        for tf_resource in tf_resources.get("rds", []):
            if tf_resource.resource_id not in aws_rds_ids:
                drift_items.append(
                    DriftItem(
                        resource_type="aws_db_instance",
                        resource_id=tf_resource.resource_id,
                        drift_type="orphaned",
                        details=f"RDS instance at '{tf_resource.resource_address}' defined in Terraform but not found in AWS",
                    )
                )

        return DriftResponse(
            drift_detected=len(drift_items) > 0,
            items=drift_items,
            checked_at=datetime.now(timezone.utc),
        )

    except Exception:
        logger.exception("Error detecting drift")
        raise HTTPException(status_code=500, detail="Drift detection failed")
