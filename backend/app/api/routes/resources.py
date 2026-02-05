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
from app.collectors.eip import ElasticIPCollector
from app.collectors.igw import InternetGatewayCollector
from app.collectors.nat_gateway import NATGatewayCollector
from app.collectors.rds import RDSCollector
from app.collectors.subnet import SubnetCollector
from app.collectors.vpc import VPCCollector
from app.config import get_settings
from app.models.database import get_db
from app.models.resources import (
    VPC,
    EC2Instance,
    ElasticIP,
    InternetGateway,
    NATGateway,
    RDSInstance,
    Region,
    Subnet,
    SyncStatus,
)
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
                EC2Instance.state.in_(states), EC2Instance.is_deleted == False
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
                RDSInstance.status.in_(statuses), RDSInstance.is_deleted == False
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

        # Collect VPCs
        vpc_collector = VPCCollector()
        vpcs = await vpc_collector.collect()
        vpc_count = await _sync_vpcs(db, vpcs, region.id)
        resources_updated += vpc_count
        logger.info(f"Synced {vpc_count} VPCs")

        # Collect Subnets
        subnet_collector = SubnetCollector()
        subnets = await subnet_collector.collect()
        subnet_count = await _sync_subnets(db, subnets, region.id)
        resources_updated += subnet_count
        logger.info(f"Synced {subnet_count} Subnets")

        # Collect Internet Gateways
        igw_collector = InternetGatewayCollector()
        igws = await igw_collector.collect()
        igw_count = await _sync_internet_gateways(db, igws, region.id)
        resources_updated += igw_count
        logger.info(f"Synced {igw_count} Internet Gateways")

        # Collect NAT Gateways
        nat_gw_collector = NATGatewayCollector()
        nat_gateways = await nat_gw_collector.collect()
        nat_gw_count = await _sync_nat_gateways(db, nat_gateways, region.id)
        resources_updated += nat_gw_count
        logger.info(f"Synced {nat_gw_count} NAT Gateways")

        # Collect Elastic IPs
        eip_collector = ElasticIPCollector()
        eips = await eip_collector.collect()
        eip_count = await _sync_elastic_ips(db, eips, region.id)
        resources_updated += eip_count
        logger.info(f"Synced {eip_count} Elastic IPs")

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


async def _sync_ec2_instances(db: AsyncSession, instances: list, region_id: int) -> int:
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
            existing.private_dns = instance_data.get("private_dns")
            existing.public_dns = instance_data.get("public_dns")
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
                private_dns=instance_data.get("private_dns"),
                public_dns=instance_data.get("public_dns"),
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
                EC2Instance.region_id == region_id,
            )
        )
        for instance in result.scalars():
            if not instance.is_deleted:
                instance.is_deleted = True
                instance.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked EC2 instance as deleted: {instance.instance_id}")

    await db.flush()
    return count


async def _sync_rds_instances(db: AsyncSession, instances: list, region_id: int) -> int:
    """Sync RDS instances to database, marking deleted ones."""
    count = 0

    # Get all existing instance identifiers for this region
    result = await db.execute(
        select(RDSInstance.db_instance_identifier).where(
            RDSInstance.region_id == region_id
        )
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
                RDSInstance.region_id == region_id,
            )
        )
        for instance in result.scalars():
            if not instance.is_deleted:
                instance.is_deleted = True
                instance.deleted_at = datetime.now(timezone.utc)
                logger.info(
                    f"Marked RDS instance as deleted: {instance.db_instance_identifier}"
                )

    await db.flush()
    return count


async def _sync_vpcs(db: AsyncSession, vpcs: list, region_id: int) -> int:
    """Sync VPCs to database, marking deleted ones."""
    count = 0

    # Get all existing VPC IDs for this region
    result = await db.execute(select(VPC.vpc_id).where(VPC.region_id == region_id))
    existing_ids = set(row[0] for row in result.all())

    # Track which VPCs we see from AWS
    seen_ids = set()

    for vpc_data in vpcs:
        vpc_id = vpc_data["vpc_id"]
        seen_ids.add(vpc_id)

        # Check if VPC exists
        result = await db.execute(select(VPC).where(VPC.vpc_id == vpc_id))
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing VPC and mark as not deleted
            existing.name = vpc_data.get("name")
            existing.cidr_block = vpc_data["cidr_block"]
            existing.state = vpc_data["state"]
            existing.is_default = vpc_data.get("is_default", False)
            existing.enable_dns_support = vpc_data.get("enable_dns_support", True)
            existing.enable_dns_hostnames = vpc_data.get("enable_dns_hostnames", False)
            existing.tags = json.dumps(vpc_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new VPC
            new_vpc = VPC(
                vpc_id=vpc_id,
                region_id=region_id,
                name=vpc_data.get("name"),
                cidr_block=vpc_data["cidr_block"],
                state=vpc_data["state"],
                is_default=vpc_data.get("is_default", False),
                enable_dns_support=vpc_data.get("enable_dns_support", True),
                enable_dns_hostnames=vpc_data.get("enable_dns_hostnames", False),
                tags=json.dumps(vpc_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_vpc)

        count += 1

    # Mark VPCs that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(VPC).where(VPC.vpc_id.in_(deleted_ids), VPC.region_id == region_id)
        )
        for vpc in result.scalars():
            if not vpc.is_deleted:
                vpc.is_deleted = True
                vpc.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked VPC as deleted: {vpc.vpc_id}")

    await db.flush()
    return count


async def _sync_subnets(db: AsyncSession, subnets: list, region_id: int) -> int:
    """Sync Subnets to database, marking deleted ones."""
    count = 0

    # Get all existing Subnet IDs for this region
    result = await db.execute(
        select(Subnet.subnet_id).where(Subnet.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which Subnets we see from AWS
    seen_ids = set()

    for subnet_data in subnets:
        subnet_id = subnet_data["subnet_id"]
        seen_ids.add(subnet_id)

        # Check if Subnet exists
        result = await db.execute(select(Subnet).where(Subnet.subnet_id == subnet_id))
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing Subnet and mark as not deleted
            existing.name = subnet_data.get("name")
            existing.vpc_id = subnet_data["vpc_id"]
            existing.cidr_block = subnet_data["cidr_block"]
            existing.availability_zone = subnet_data["availability_zone"]
            existing.subnet_type = subnet_data["subnet_type"]
            existing.state = subnet_data["state"]
            existing.available_ip_count = subnet_data.get("available_ip_count", 0)
            existing.map_public_ip_on_launch = subnet_data.get(
                "map_public_ip_on_launch", False
            )
            existing.tags = json.dumps(subnet_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new Subnet
            new_subnet = Subnet(
                subnet_id=subnet_id,
                region_id=region_id,
                name=subnet_data.get("name"),
                vpc_id=subnet_data["vpc_id"],
                cidr_block=subnet_data["cidr_block"],
                availability_zone=subnet_data["availability_zone"],
                subnet_type=subnet_data["subnet_type"],
                state=subnet_data["state"],
                available_ip_count=subnet_data.get("available_ip_count", 0),
                map_public_ip_on_launch=subnet_data.get(
                    "map_public_ip_on_launch", False
                ),
                tags=json.dumps(subnet_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_subnet)

        count += 1

    # Mark Subnets that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(Subnet).where(
                Subnet.subnet_id.in_(deleted_ids), Subnet.region_id == region_id
            )
        )
        for subnet in result.scalars():
            if not subnet.is_deleted:
                subnet.is_deleted = True
                subnet.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked Subnet as deleted: {subnet.subnet_id}")

    await db.flush()
    return count


async def _sync_internet_gateways(db: AsyncSession, igws: list, region_id: int) -> int:
    """Sync Internet Gateways to database, marking deleted ones."""
    count = 0

    # Get all existing IGW IDs for this region
    result = await db.execute(
        select(InternetGateway.igw_id).where(InternetGateway.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which IGWs we see from AWS
    seen_ids = set()

    for igw_data in igws:
        igw_id = igw_data["igw_id"]
        seen_ids.add(igw_id)

        # Check if IGW exists
        result = await db.execute(
            select(InternetGateway).where(InternetGateway.igw_id == igw_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing IGW and mark as not deleted
            existing.name = igw_data.get("name")
            existing.vpc_id = igw_data.get("vpc_id")
            existing.state = igw_data["state"]
            existing.tags = json.dumps(igw_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new IGW
            new_igw = InternetGateway(
                igw_id=igw_id,
                region_id=region_id,
                name=igw_data.get("name"),
                vpc_id=igw_data.get("vpc_id"),
                state=igw_data["state"],
                tags=json.dumps(igw_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_igw)

        count += 1

    # Mark IGWs that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(InternetGateway).where(
                InternetGateway.igw_id.in_(deleted_ids),
                InternetGateway.region_id == region_id,
            )
        )
        for igw in result.scalars():
            if not igw.is_deleted:
                igw.is_deleted = True
                igw.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked Internet Gateway as deleted: {igw.igw_id}")

    await db.flush()
    return count


async def _sync_nat_gateways(
    db: AsyncSession, nat_gateways: list, region_id: int
) -> int:
    """Sync NAT Gateways to database, marking deleted ones."""
    count = 0

    # Get all existing NAT Gateway IDs for this region
    result = await db.execute(
        select(NATGateway.nat_gateway_id).where(NATGateway.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which NAT Gateways we see from AWS
    seen_ids = set()

    for nat_gw_data in nat_gateways:
        nat_gateway_id = nat_gw_data["nat_gateway_id"]
        seen_ids.add(nat_gateway_id)

        # Check if NAT Gateway exists
        result = await db.execute(
            select(NATGateway).where(NATGateway.nat_gateway_id == nat_gateway_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing NAT Gateway and mark as not deleted
            existing.name = nat_gw_data.get("name")
            existing.vpc_id = nat_gw_data["vpc_id"]
            existing.subnet_id = nat_gw_data["subnet_id"]
            existing.state = nat_gw_data["state"]
            existing.connectivity_type = nat_gw_data["connectivity_type"]
            existing.primary_private_ip = nat_gw_data.get("primary_private_ip")
            existing.primary_public_ip = nat_gw_data.get("primary_public_ip")
            existing.allocation_id = nat_gw_data.get("allocation_id")
            existing.network_interface_id = nat_gw_data.get("network_interface_id")
            existing.tags = json.dumps(nat_gw_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new NAT Gateway
            new_nat_gw = NATGateway(
                nat_gateway_id=nat_gateway_id,
                region_id=region_id,
                name=nat_gw_data.get("name"),
                vpc_id=nat_gw_data["vpc_id"],
                subnet_id=nat_gw_data["subnet_id"],
                state=nat_gw_data["state"],
                connectivity_type=nat_gw_data["connectivity_type"],
                primary_private_ip=nat_gw_data.get("primary_private_ip"),
                primary_public_ip=nat_gw_data.get("primary_public_ip"),
                allocation_id=nat_gw_data.get("allocation_id"),
                network_interface_id=nat_gw_data.get("network_interface_id"),
                tags=json.dumps(nat_gw_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_nat_gw)

        count += 1

    # Mark NAT Gateways that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(NATGateway).where(
                NATGateway.nat_gateway_id.in_(deleted_ids),
                NATGateway.region_id == region_id,
            )
        )
        for nat_gw in result.scalars():
            if not nat_gw.is_deleted:
                nat_gw.is_deleted = True
                nat_gw.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked NAT Gateway as deleted: {nat_gw.nat_gateway_id}")

    await db.flush()
    return count


async def _sync_elastic_ips(db: AsyncSession, eips: list, region_id: int) -> int:
    """Sync Elastic IPs to database, marking deleted ones."""
    count = 0

    # Get all existing Elastic IP allocation IDs for this region
    result = await db.execute(
        select(ElasticIP.allocation_id).where(ElasticIP.region_id == region_id)
    )
    existing_ids = set(row[0] for row in result.all())

    # Track which Elastic IPs we see from AWS
    seen_ids = set()

    for eip_data in eips:
        allocation_id = eip_data["allocation_id"]
        seen_ids.add(allocation_id)

        # Check if Elastic IP exists
        result = await db.execute(
            select(ElasticIP).where(ElasticIP.allocation_id == allocation_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing Elastic IP and mark as not deleted
            existing.name = eip_data.get("name")
            existing.public_ip = eip_data["public_ip"]
            existing.private_ip = eip_data.get("private_ip")
            existing.association_id = eip_data.get("association_id")
            existing.instance_id = eip_data.get("instance_id")
            existing.network_interface_id = eip_data.get("network_interface_id")
            existing.domain = eip_data["domain"]
            existing.tags = json.dumps(eip_data.get("tags", {}))
            existing.is_deleted = False
            existing.deleted_at = None
        else:
            # Create new Elastic IP
            new_eip = ElasticIP(
                allocation_id=allocation_id,
                region_id=region_id,
                name=eip_data.get("name"),
                public_ip=eip_data["public_ip"],
                private_ip=eip_data.get("private_ip"),
                association_id=eip_data.get("association_id"),
                instance_id=eip_data.get("instance_id"),
                network_interface_id=eip_data.get("network_interface_id"),
                domain=eip_data["domain"],
                tags=json.dumps(eip_data.get("tags", {})),
                is_deleted=False,
            )
            db.add(new_eip)

        count += 1

    # Mark Elastic IPs that weren't in AWS response as deleted
    deleted_ids = existing_ids - seen_ids
    if deleted_ids:
        result = await db.execute(
            select(ElasticIP).where(
                ElasticIP.allocation_id.in_(deleted_ids),
                ElasticIP.region_id == region_id,
            )
        )
        for eip in result.scalars():
            if not eip.is_deleted:
                eip.is_deleted = True
                eip.deleted_at = datetime.now(timezone.utc)
                logger.info(f"Marked Elastic IP as deleted: {eip.allocation_id}")

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

        # Update VPCs
        for tf_resource in tf_resources.get("vpc", []):
            result = await db.execute(
                select(VPC).where(VPC.vpc_id == tf_resource.resource_id)
            )
            vpc = result.scalar_one_or_none()
            if vpc:
                vpc.tf_managed = True
                vpc.tf_state_source = tf_resource.state_source
                vpc.tf_resource_address = tf_resource.resource_address
                count += 1

        # Update Subnets
        for tf_resource in tf_resources.get("subnet", []):
            result = await db.execute(
                select(Subnet).where(Subnet.subnet_id == tf_resource.resource_id)
            )
            subnet = result.scalar_one_or_none()
            if subnet:
                subnet.tf_managed = True
                subnet.tf_state_source = tf_resource.state_source
                subnet.tf_resource_address = tf_resource.resource_address
                count += 1

        # Update Internet Gateways
        for tf_resource in tf_resources.get("igw", []):
            result = await db.execute(
                select(InternetGateway).where(
                    InternetGateway.igw_id == tf_resource.resource_id
                )
            )
            igw = result.scalar_one_or_none()
            if igw:
                igw.tf_managed = True
                igw.tf_state_source = tf_resource.state_source
                igw.tf_resource_address = tf_resource.resource_address
                count += 1

        # Update NAT Gateways
        for tf_resource in tf_resources.get("nat_gateway", []):
            result = await db.execute(
                select(NATGateway).where(
                    NATGateway.nat_gateway_id == tf_resource.resource_id
                )
            )
            nat_gw = result.scalar_one_or_none()
            if nat_gw:
                nat_gw.tf_managed = True
                nat_gw.tf_state_source = tf_resource.state_source
                nat_gw.tf_resource_address = tf_resource.resource_address
                count += 1

        # Update Elastic IPs
        for tf_resource in tf_resources.get("eip", []):
            result = await db.execute(
                select(ElasticIP).where(
                    ElasticIP.allocation_id == tf_resource.resource_id
                )
            )
            eip = result.scalar_one_or_none()
            if eip:
                eip.tf_managed = True
                eip.tf_state_source = tf_resource.state_source
                eip.tf_resource_address = tf_resource.resource_address
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
