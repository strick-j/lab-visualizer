"""
Topology visualization endpoint.

Provides hierarchical infrastructure data for graphical visualization.
Returns resources organized by VPC with optional management-status filtering.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import get_db
from app.models.resources import (
    VPC,
    EC2Instance,
    ECSContainer,
    ElasticIP,
    InternetGateway,
    NATGateway,
    RDSInstance,
    Subnet,
    SyncStatus,
)
from app.schemas.resources import (
    DisplayStatus,
    TopologyEC2Instance,
    TopologyECSContainer,
    TopologyElasticIP,
    TopologyInternetGateway,
    TopologyMeta,
    TopologyNATGateway,
    TopologyRDSInstance,
    TopologyResponse,
    TopologySubnet,
    TopologyVPC,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _tf_managed_filter(model, tf_managed: Optional[bool]) -> List:
    """Build optional tf_managed filter clause."""
    if tf_managed is None:
        return []
    return [model.tf_managed == tf_managed]


def _get_display_status(state: str, resource_type: str) -> DisplayStatus:
    """Map resource state to display status."""
    state_lower = state.lower() if state else ""

    # VPC and Subnet states
    if resource_type in ("vpc", "subnet"):
        if state_lower == "available":
            return DisplayStatus.ACTIVE
        elif state_lower in ("pending", "creating"):
            return DisplayStatus.TRANSITIONING
        return DisplayStatus.UNKNOWN

    # EC2 states
    if resource_type == "ec2":
        if state_lower == "running":
            return DisplayStatus.ACTIVE
        elif state_lower == "stopped":
            return DisplayStatus.INACTIVE
        elif state_lower in ("pending", "stopping", "shutting-down"):
            return DisplayStatus.TRANSITIONING
        elif state_lower == "terminated":
            return DisplayStatus.ERROR
        return DisplayStatus.UNKNOWN

    # RDS states
    if resource_type == "rds":
        if state_lower == "available":
            return DisplayStatus.ACTIVE
        elif state_lower == "stopped":
            return DisplayStatus.INACTIVE
        elif state_lower in (
            "starting",
            "stopping",
            "creating",
            "deleting",
            "modifying",
        ):
            return DisplayStatus.TRANSITIONING
        elif state_lower == "failed":
            return DisplayStatus.ERROR
        return DisplayStatus.UNKNOWN

    # Gateway states
    if resource_type in ("igw", "nat_gateway"):
        if state_lower in ("available", "attached"):
            return DisplayStatus.ACTIVE
        elif state_lower in ("pending", "deleting", "detaching"):
            return DisplayStatus.TRANSITIONING
        elif state_lower in ("deleted", "failed"):
            return DisplayStatus.ERROR
        return DisplayStatus.UNKNOWN

    # ECS task states (uppercase)
    if resource_type == "ecs":
        state_upper = state.upper() if state else ""
        if state_upper == "RUNNING":
            return DisplayStatus.ACTIVE
        elif state_upper == "STOPPED":
            return DisplayStatus.INACTIVE
        elif state_upper in (
            "PROVISIONING",
            "PENDING",
            "ACTIVATING",
            "DEPROVISIONING",
            "STOPPING",
            "DEACTIVATING",
        ):
            return DisplayStatus.TRANSITIONING
        elif state_upper == "DELETED":
            return DisplayStatus.ERROR
        return DisplayStatus.UNKNOWN

    return DisplayStatus.UNKNOWN


@router.get("/topology", response_model=TopologyResponse)
async def get_topology(
    vpc_id: Optional[str] = Query(None, description="Filter by specific VPC ID"),
    tf_managed: Optional[bool] = Query(
        None,
        description="Filter by Terraform managed status (true/false). Omit to show all resources.",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Get hierarchical infrastructure topology for visualization.

    Returns resources organized in a hierarchy:
    - VPCs contain Subnets, Internet Gateways, and Elastic IPs
    - Subnets contain EC2 instances, RDS instances, and NAT Gateways

    By default returns all resources. Use tf_managed=true to show only
    Terraform-managed resources, or tf_managed=false for unmanaged only.
    """
    # Build VPC query - optionally filter by tf_managed status
    vpc_query = select(VPC).where(
        *_tf_managed_filter(VPC, tf_managed),
        VPC.is_deleted == False,
    )
    if vpc_id:
        vpc_query = vpc_query.where(VPC.vpc_id == vpc_id)

    vpc_result = await db.execute(vpc_query)
    vpcs = vpc_result.scalars().all()

    topology_vpcs = []
    total_subnets = 0
    total_ec2 = 0
    total_rds = 0
    total_ecs_containers = 0
    total_nat_gateways = 0
    total_igws = 0
    total_eips = 0

    for vpc in vpcs:
        # Get Internet Gateway for this VPC
        igw_result = await db.execute(
            select(InternetGateway).where(
                InternetGateway.vpc_id == vpc.vpc_id,
                *_tf_managed_filter(InternetGateway, tf_managed),
                InternetGateway.is_deleted == False,
            )
        )
        igw = igw_result.scalar_one_or_none()

        topology_igw = None
        if igw:
            total_igws += 1
            topology_igw = TopologyInternetGateway(
                id=igw.igw_id,
                name=igw.name,
                state=igw.state,
                display_status=_get_display_status(igw.state, "igw"),
                tf_managed=igw.tf_managed,
                tf_resource_address=igw.tf_resource_address,
            )

        # Get Subnets for this VPC
        subnet_result = await db.execute(
            select(Subnet)
            .where(
                Subnet.vpc_id == vpc.vpc_id,
                *_tf_managed_filter(Subnet, tf_managed),
                Subnet.is_deleted == False,
            )
            .order_by(Subnet.subnet_type, Subnet.availability_zone)
        )
        subnets = subnet_result.scalars().all()

        # Query RDS instances once per VPC (not per subnet) to avoid
        # duplicate node IDs that break React Flow rendering.
        # RDS uses DB Subnet Groups so we attach them to the first
        # private subnet only.
        rds_result = await db.execute(
            select(RDSInstance).where(
                RDSInstance.vpc_id == vpc.vpc_id,
                *_tf_managed_filter(RDSInstance, tf_managed),
                RDSInstance.is_deleted == False,
            )
        )
        vpc_rds_instances = rds_result.scalars().all()
        rds_placed = False

        topology_subnets = []
        for subnet in subnets:
            total_subnets += 1

            # Get NAT Gateway in this subnet
            nat_result = await db.execute(
                select(NATGateway).where(
                    NATGateway.subnet_id == subnet.subnet_id,
                    *_tf_managed_filter(NATGateway, tf_managed),
                    NATGateway.is_deleted == False,
                )
            )
            nat = nat_result.scalar_one_or_none()

            topology_nat = None
            if nat:
                total_nat_gateways += 1
                topology_nat = TopologyNATGateway(
                    id=nat.nat_gateway_id,
                    name=nat.name,
                    state=nat.state,
                    display_status=_get_display_status(nat.state, "nat_gateway"),
                    primary_public_ip=nat.primary_public_ip,
                    tf_managed=nat.tf_managed,
                    tf_resource_address=nat.tf_resource_address,
                )

            # Get EC2 instances in this subnet
            ec2_result = await db.execute(
                select(EC2Instance).where(
                    EC2Instance.subnet_id == subnet.subnet_id,
                    *_tf_managed_filter(EC2Instance, tf_managed),
                    EC2Instance.is_deleted == False,
                )
            )
            ec2_instances = ec2_result.scalars().all()

            topology_ec2 = []
            for ec2 in ec2_instances:
                total_ec2 += 1
                topology_ec2.append(
                    TopologyEC2Instance(
                        id=ec2.instance_id,
                        name=ec2.name,
                        instance_type=ec2.instance_type,
                        state=ec2.state,
                        display_status=_get_display_status(ec2.state, "ec2"),
                        private_ip=ec2.private_ip,
                        public_ip=ec2.public_ip,
                        private_dns=ec2.private_dns,
                        public_dns=ec2.public_dns,
                        tf_managed=ec2.tf_managed,
                        tf_resource_address=ec2.tf_resource_address,
                    )
                )

            # Attach RDS instances to the first private subnet only.
            # RDS uses DB Subnet Groups (VPC-level), so there's no
            # per-subnet association. Placing them in every private
            # subnet would create duplicate React Flow node IDs.
            topology_rds = []
            if subnet.subnet_type == "private" and not rds_placed:
                rds_placed = True
                for rds in vpc_rds_instances:
                    total_rds += 1
                    topology_rds.append(
                        TopologyRDSInstance(
                            id=rds.db_instance_identifier,
                            name=rds.name,
                            engine=rds.engine,
                            instance_class=rds.db_instance_class,
                            status=rds.status,
                            display_status=_get_display_status(rds.status, "rds"),
                            endpoint=rds.endpoint,
                            port=rds.port,
                            tf_managed=rds.tf_managed,
                            tf_resource_address=rds.tf_resource_address,
                        )
                    )

            # Get ECS containers in this subnet (include both TF-managed
            # and CI/CD-deployed containers for full visibility)
            ecs_result = await db.execute(
                select(ECSContainer).where(
                    ECSContainer.subnet_id == subnet.subnet_id,
                    ECSContainer.is_deleted == False,
                )
            )
            ecs_containers = ecs_result.scalars().all()

            topology_ecs = []
            for ecs_container in ecs_containers:
                total_ecs_containers += 1
                # Resolve managed_by: TF flag takes precedence,
                # then fall back to the stored managed_by value
                managed_by_value = "unmanaged"
                if ecs_container.tf_managed:
                    managed_by_value = "terraform"
                elif getattr(ecs_container, "managed_by", "") == "github_actions":
                    managed_by_value = "github_actions"
                topology_ecs.append(
                    TopologyECSContainer(
                        id=ecs_container.task_id,
                        name=ecs_container.name,
                        cluster_name=ecs_container.cluster_name,
                        launch_type=ecs_container.launch_type,
                        status=ecs_container.status,
                        display_status=_get_display_status(ecs_container.status, "ecs"),
                        cpu=ecs_container.cpu,
                        memory=ecs_container.memory,
                        image=ecs_container.image,
                        image_tag=getattr(ecs_container, "image_tag", None),
                        container_port=ecs_container.container_port,
                        private_ip=ecs_container.private_ip,
                        tf_managed=ecs_container.tf_managed,
                        tf_resource_address=ecs_container.tf_resource_address,
                        managed_by=managed_by_value,
                    )
                )

            topology_subnets.append(
                TopologySubnet(
                    id=subnet.subnet_id,
                    name=subnet.name,
                    cidr_block=subnet.cidr_block,
                    availability_zone=subnet.availability_zone,
                    subnet_type=subnet.subnet_type,
                    display_status=_get_display_status(subnet.state, "subnet"),
                    tf_managed=subnet.tf_managed,
                    tf_resource_address=subnet.tf_resource_address,
                    nat_gateway=topology_nat,
                    ec2_instances=topology_ec2,
                    rds_instances=topology_rds,
                    ecs_containers=topology_ecs,
                )
            )

        # Get Elastic IPs associated with resources in this VPC
        eip_result = await db.execute(
            select(ElasticIP).where(
                *_tf_managed_filter(ElasticIP, tf_managed),
                ElasticIP.is_deleted == False,
            )
        )
        eips = eip_result.scalars().all()

        topology_eips = []
        for eip in eips:
            # Determine what the EIP is associated with
            associated_with = None
            association_type = None

            if eip.instance_id:
                # Check if the instance is in this VPC
                ec2_check = await db.execute(
                    select(EC2Instance).where(
                        EC2Instance.instance_id == eip.instance_id,
                        EC2Instance.vpc_id == vpc.vpc_id,
                    )
                )
                if ec2_check.scalar_one_or_none():
                    associated_with = eip.instance_id
                    association_type = "ec2"

            if not associated_with and eip.allocation_id:
                # Check if associated with a NAT Gateway in this VPC
                nat_check = await db.execute(
                    select(NATGateway).where(
                        NATGateway.allocation_id == eip.allocation_id,
                        NATGateway.vpc_id == vpc.vpc_id,
                    )
                )
                nat_match = nat_check.scalar_one_or_none()
                if nat_match:
                    associated_with = nat_match.nat_gateway_id
                    association_type = "nat_gateway"

            if associated_with:
                total_eips += 1
                topology_eips.append(
                    TopologyElasticIP(
                        id=eip.allocation_id,
                        public_ip=eip.public_ip,
                        associated_with=associated_with,
                        association_type=association_type,
                        tf_managed=eip.tf_managed,
                        tf_resource_address=eip.tf_resource_address,
                    )
                )

        topology_vpcs.append(
            TopologyVPC(
                id=vpc.vpc_id,
                name=vpc.name,
                cidr_block=vpc.cidr_block,
                state=vpc.state,
                display_status=_get_display_status(vpc.state, "vpc"),
                tf_managed=vpc.tf_managed,
                tf_resource_address=vpc.tf_resource_address,
                internet_gateway=topology_igw,
                subnets=topology_subnets,
                elastic_ips=topology_eips,
            )
        )

    # Get last sync time
    sync_result = await db.execute(
        select(SyncStatus.last_synced_at)
        .where(SyncStatus.source == "aws")
        .order_by(SyncStatus.last_synced_at.desc())
        .limit(1)
    )
    last_refreshed = sync_result.scalar_one_or_none()

    return TopologyResponse(
        vpcs=topology_vpcs,
        meta=TopologyMeta(
            total_vpcs=len(topology_vpcs),
            total_subnets=total_subnets,
            total_ec2=total_ec2,
            total_rds=total_rds,
            total_ecs_containers=total_ecs_containers,
            total_nat_gateways=total_nat_gateways,
            total_internet_gateways=total_igws,
            total_elastic_ips=total_eips,
            last_refreshed=last_refreshed,
        ),
    )
