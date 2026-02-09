#!/usr/bin/env python3
"""
Seed the database with sample data for development and testing.

This script populates the database with sample EC2 and RDS instances
to facilitate frontend development and testing without requiring actual AWS resources.

Usage:
    python -m scripts.seed_db

    or

    python scripts/seed_db.py
"""

import asyncio
import json
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from app.config import get_settings
from app.models.database import async_session_maker, init_db
from app.models.resources import (
    VPC,
    EC2Instance,
    ECSContainer,
    ElasticIP,
    InternetGateway,
    NATGateway,
    RDSInstance,
    Region,
    Subnet,
    SyncStatus,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


async def seed_regions(session):
    """Create sample AWS regions."""
    regions = [
        Region(name="us-east-1", enabled=True),
        Region(name="us-west-2", enabled=True),
        Region(name="eu-west-1", enabled=True),
    ]

    for region in regions:
        session.add(region)

    await session.commit()
    logger.info(f"✓ Created {len(regions)} regions")
    return regions


async def seed_vpcs(session, regions):
    """Create sample VPCs."""
    us_east = next(r for r in regions if r.name == "us-east-1")
    us_west = next(r for r in regions if r.name == "us-west-2")

    vpcs = [
        VPC(
            vpc_id="vpc-0a1b2c3d",
            region_id=us_east.id,
            name="lab-production",
            cidr_block="10.0.0.0/16",
            state="available",
            is_default=False,
            enable_dns_support=True,
            enable_dns_hostnames=True,
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_vpc.main",
        ),
        VPC(
            vpc_id="vpc-1b2c3d4e",
            region_id=us_west.id,
            name="lab-production-west",
            cidr_block="10.1.0.0/16",
            state="available",
            is_default=False,
            enable_dns_support=True,
            enable_dns_hostnames=True,
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_vpc.main_west",
        ),
    ]

    for vpc in vpcs:
        session.add(vpc)

    await session.commit()
    logger.info(f"✓ Created {len(vpcs)} VPCs")


async def seed_subnets(session, regions):
    """Create sample subnets."""
    us_east = next(r for r in regions if r.name == "us-east-1")
    us_west = next(r for r in regions if r.name == "us-west-2")

    subnets = [
        # US East public subnet
        Subnet(
            subnet_id="subnet-pub-0a1b2c3d",
            region_id=us_east.id,
            name="lab-public-1a",
            vpc_id="vpc-0a1b2c3d",
            cidr_block="10.0.1.0/24",
            availability_zone="us-east-1a",
            subnet_type="public",
            state="available",
            available_ip_count=245,
            map_public_ip_on_launch=True,
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_subnet.public_1a",
        ),
        # US East private subnet (same as what EC2/RDS seeds reference)
        Subnet(
            subnet_id="subnet-0a1b2c3d",
            region_id=us_east.id,
            name="lab-private-1a",
            vpc_id="vpc-0a1b2c3d",
            cidr_block="10.0.10.0/24",
            availability_zone="us-east-1a",
            subnet_type="private",
            state="available",
            available_ip_count=240,
            map_public_ip_on_launch=False,
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_subnet.private_1a",
        ),
        # US East private subnet 1b
        Subnet(
            subnet_id="subnet-priv-1b",
            region_id=us_east.id,
            name="lab-private-1b",
            vpc_id="vpc-0a1b2c3d",
            cidr_block="10.0.11.0/24",
            availability_zone="us-east-1b",
            subnet_type="private",
            state="available",
            available_ip_count=250,
            map_public_ip_on_launch=False,
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_subnet.private_1b",
        ),
        # US West public subnet
        Subnet(
            subnet_id="subnet-1b2c3d4e",
            region_id=us_west.id,
            name="lab-public-west-2a",
            vpc_id="vpc-1b2c3d4e",
            cidr_block="10.1.1.0/24",
            availability_zone="us-west-2a",
            subnet_type="public",
            state="available",
            available_ip_count=245,
            map_public_ip_on_launch=True,
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_subnet.public_west_2a",
        ),
        # US West private subnet
        Subnet(
            subnet_id="subnet-priv-west-2a",
            region_id=us_west.id,
            name="lab-private-west-2a",
            vpc_id="vpc-1b2c3d4e",
            cidr_block="10.1.10.0/24",
            availability_zone="us-west-2a",
            subnet_type="private",
            state="available",
            available_ip_count=248,
            map_public_ip_on_launch=False,
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_subnet.private_west_2a",
        ),
    ]

    for subnet in subnets:
        session.add(subnet)

    await session.commit()
    logger.info(f"✓ Created {len(subnets)} subnets")


async def seed_internet_gateways(session, regions):
    """Create sample Internet Gateways."""
    us_east = next(r for r in regions if r.name == "us-east-1")
    us_west = next(r for r in regions if r.name == "us-west-2")

    igws = [
        InternetGateway(
            igw_id="igw-0a1b2c3d",
            region_id=us_east.id,
            name="lab-igw",
            vpc_id="vpc-0a1b2c3d",
            state="attached",
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_internet_gateway.main",
        ),
        InternetGateway(
            igw_id="igw-1b2c3d4e",
            region_id=us_west.id,
            name="lab-igw-west",
            vpc_id="vpc-1b2c3d4e",
            state="attached",
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_internet_gateway.main_west",
        ),
    ]

    for igw in igws:
        session.add(igw)

    await session.commit()
    logger.info(f"✓ Created {len(igws)} Internet Gateways")


async def seed_nat_gateways(session, regions):
    """Create sample NAT Gateways."""
    us_east = next(r for r in regions if r.name == "us-east-1")

    nat_gateways = [
        NATGateway(
            nat_gateway_id="nat-0a1b2c3d",
            region_id=us_east.id,
            name="lab-nat",
            vpc_id="vpc-0a1b2c3d",
            subnet_id="subnet-pub-0a1b2c3d",
            state="available",
            connectivity_type="public",
            primary_private_ip="10.0.1.50",
            primary_public_ip="52.10.20.30",
            allocation_id="eipalloc-0a1b2c3d",
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_nat_gateway.main",
        ),
    ]

    for nat in nat_gateways:
        session.add(nat)

    await session.commit()
    logger.info(f"✓ Created {len(nat_gateways)} NAT Gateways")


async def seed_elastic_ips(session, regions):
    """Create sample Elastic IPs."""
    us_east = next(r for r in regions if r.name == "us-east-1")

    eips = [
        ElasticIP(
            allocation_id="eipalloc-0a1b2c3d",
            region_id=us_east.id,
            name="lab-nat-eip",
            public_ip="52.10.20.30",
            domain="vpc",
            association_id="eipassoc-nat01",
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_eip.nat",
        ),
        ElasticIP(
            allocation_id="eipalloc-web01",
            region_id=us_east.id,
            name="lab-web-eip",
            public_ip="54.123.45.67",
            domain="vpc",
            association_id="eipassoc-web01",
            instance_id="i-0123456789abcdef0",
            tags=json.dumps({"Environment": "production"}),
            tf_managed=True,
            tf_state_source="lab/networking/terraform.tfstate",
            tf_resource_address="aws_eip.web",
        ),
    ]

    for eip in eips:
        session.add(eip)

    await session.commit()
    logger.info(f"✓ Created {len(eips)} Elastic IPs")


async def seed_ecs_containers(session, regions):
    """Create sample ECS containers."""
    us_east = next(r for r in regions if r.name == "us-east-1")

    containers = [
        ECSContainer(
            task_id="ecs-task-abc123def456",
            region_id=us_east.id,
            name="lab-api-task",
            cluster_name="lab-production",
            task_definition_arn="arn:aws:ecs:us-east-1:123456789012:task-definition/lab-api:5",
            launch_type="FARGATE",
            status="RUNNING",
            desired_status="RUNNING",
            cpu=512,
            memory=1024,
            image="123456789012.dkr.ecr.us-east-1.amazonaws.com/lab-api:latest",
            container_port=8000,
            private_ip="10.0.10.100",
            subnet_id="subnet-0a1b2c3d",
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1a",
            started_at=datetime.utcnow() - timedelta(hours=12),
            tags=json.dumps({"Environment": "production", "Service": "api"}),
            tf_managed=True,
            tf_state_source="lab/ecs/terraform.tfstate",
            tf_resource_address="aws_ecs_service.api",
        ),
        ECSContainer(
            task_id="ecs-task-def789ghi012",
            region_id=us_east.id,
            name="lab-frontend-task",
            cluster_name="lab-production",
            task_definition_arn="arn:aws:ecs:us-east-1:123456789012:task-definition/lab-frontend:3",
            launch_type="FARGATE",
            status="RUNNING",
            desired_status="RUNNING",
            cpu=256,
            memory=512,
            image="123456789012.dkr.ecr.us-east-1.amazonaws.com/lab-frontend:latest",
            container_port=3000,
            private_ip="10.0.10.101",
            subnet_id="subnet-0a1b2c3d",
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1a",
            started_at=datetime.utcnow() - timedelta(hours=6),
            tags=json.dumps({"Environment": "production", "Service": "frontend"}),
            tf_managed=True,
            tf_state_source="lab/ecs/terraform.tfstate",
            tf_resource_address="aws_ecs_service.frontend",
        ),
        ECSContainer(
            task_id="ecs-task-ghi345jkl678",
            region_id=us_east.id,
            name="lab-worker-task",
            cluster_name="lab-production",
            task_definition_arn="arn:aws:ecs:us-east-1:123456789012:task-definition/lab-worker:2",
            launch_type="FARGATE",
            status="RUNNING",
            desired_status="RUNNING",
            cpu=1024,
            memory=2048,
            image="123456789012.dkr.ecr.us-east-1.amazonaws.com/lab-worker:latest",
            container_port=None,
            private_ip="10.0.11.50",
            subnet_id="subnet-priv-1b",
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1b",
            started_at=datetime.utcnow() - timedelta(hours=24),
            tags=json.dumps({"Environment": "production", "Service": "worker"}),
            tf_managed=True,
            tf_state_source="lab/ecs/terraform.tfstate",
            tf_resource_address="aws_ecs_service.worker",
        ),
        ECSContainer(
            task_id="ecs-task-jkl901mno234",
            region_id=us_east.id,
            name="lab-batch-task",
            cluster_name="lab-production",
            task_definition_arn="arn:aws:ecs:us-east-1:123456789012:task-definition/lab-batch:1",
            launch_type="FARGATE",
            status="STOPPED",
            desired_status="STOPPED",
            cpu=2048,
            memory=4096,
            image="123456789012.dkr.ecr.us-east-1.amazonaws.com/lab-batch:latest",
            container_port=None,
            private_ip="10.0.11.51",
            subnet_id="subnet-priv-1b",
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1b",
            started_at=datetime.utcnow() - timedelta(hours=48),
            tags=json.dumps({"Environment": "production", "Service": "batch"}),
            tf_managed=True,
            tf_state_source="lab/ecs/terraform.tfstate",
            tf_resource_address="aws_ecs_service.batch",
        ),
    ]

    for container in containers:
        session.add(container)

    await session.commit()
    logger.info(f"✓ Created {len(containers)} ECS containers")


async def seed_ec2_instances(session, regions):
    """Create sample EC2 instances."""
    # Get region IDs
    us_east = next(r for r in regions if r.name == "us-east-1")
    us_west = next(r for r in regions if r.name == "us-west-2")
    eu_west = next(r for r in regions if r.name == "eu-west-1")

    instances = [
        # US East instances
        EC2Instance(
            instance_id="i-0123456789abcdef0",
            region_id=us_east.id,
            name="web-server-01",
            instance_type="t3.medium",
            state="running",
            private_ip="10.0.1.10",
            public_ip="54.123.45.67",
            vpc_id="vpc-0a1b2c3d",
            subnet_id="subnet-0a1b2c3d",
            availability_zone="us-east-1a",
            launch_time=datetime.utcnow() - timedelta(days=30),
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/compute/terraform.tfstate",
            tf_resource_address="aws_instance.web_server",
        ),
        EC2Instance(
            instance_id="i-1234567890abcdef1",
            region_id=us_east.id,
            name="api-server-01",
            instance_type="t3.large",
            state="running",
            private_ip="10.0.1.11",
            public_ip="54.123.45.68",
            vpc_id="vpc-0a1b2c3d",
            subnet_id="subnet-0a1b2c3d",
            availability_zone="us-east-1a",
            launch_time=datetime.utcnow() - timedelta(days=15),
            tags=json.dumps({"Environment": "production", "Team": "backend"}),
            tf_managed=True,
            tf_state_source="lab/compute/terraform.tfstate",
            tf_resource_address="aws_instance.api_server",
        ),
        EC2Instance(
            instance_id="i-2345678901abcdef2",
            region_id=us_east.id,
            name="worker-01",
            instance_type="t3.xlarge",
            state="stopped",
            private_ip="10.0.1.12",
            vpc_id="vpc-0a1b2c3d",
            subnet_id="subnet-0a1b2c3d",
            availability_zone="us-east-1b",
            launch_time=datetime.utcnow() - timedelta(days=45),
            tags=json.dumps({"Environment": "staging", "Team": "data"}),
            tf_managed=False,
        ),
        # US West instances
        EC2Instance(
            instance_id="i-3456789012abcdef3",
            region_id=us_west.id,
            name="web-server-west-01",
            instance_type="t3.medium",
            state="running",
            private_ip="10.1.1.10",
            public_ip="34.56.78.90",
            vpc_id="vpc-1b2c3d4e",
            subnet_id="subnet-1b2c3d4e",
            availability_zone="us-west-2a",
            launch_time=datetime.utcnow() - timedelta(days=20),
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/compute/terraform.tfstate",
            tf_resource_address="aws_instance.web_server_west",
        ),
        # EU instance
        EC2Instance(
            instance_id="i-4567890123abcdef4",
            region_id=eu_west.id,
            name="api-server-eu-01",
            instance_type="t3.small",
            state="pending",
            private_ip="10.2.1.10",
            vpc_id="vpc-2c3d4e5f",
            subnet_id="subnet-2c3d4e5f",
            availability_zone="eu-west-1a",
            launch_time=datetime.utcnow() - timedelta(minutes=5),
            tags=json.dumps({"Environment": "development", "Team": "backend"}),
            tf_managed=False,
        ),
    ]

    for instance in instances:
        session.add(instance)

    await session.commit()
    logger.info(f"✓ Created {len(instances)} EC2 instances")


async def seed_rds_instances(session, regions):
    """Create sample RDS instances."""
    # Get region IDs
    us_east = next(r for r in regions if r.name == "us-east-1")
    us_west = next(r for r in regions if r.name == "us-west-2")

    instances = [
        # US East databases
        RDSInstance(
            db_instance_identifier="prod-postgres-01",
            region_id=us_east.id,
            name="prod-postgres-01",
            db_instance_class="db.t3.medium",
            status="available",
            engine="postgres",
            engine_version="15.4",
            allocated_storage=100,
            endpoint="prod-postgres-01.abc123.us-east-1.rds.amazonaws.com",
            port=5432,
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1a",
            multi_az=True,
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/databases/terraform.tfstate",
            tf_resource_address="aws_db_instance.main",
        ),
        RDSInstance(
            db_instance_identifier="staging-mysql-01",
            region_id=us_east.id,
            name="staging-mysql-01",
            db_instance_class="db.t3.small",
            status="available",
            engine="mysql",
            engine_version="8.0.35",
            allocated_storage=50,
            endpoint="staging-mysql-01.abc123.us-east-1.rds.amazonaws.com",
            port=3306,
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1b",
            multi_az=False,
            tags=json.dumps({"Environment": "staging", "Team": "backend"}),
            tf_managed=True,
            tf_state_source="lab/databases/terraform.tfstate",
            tf_resource_address="aws_db_instance.staging",
        ),
        RDSInstance(
            db_instance_identifier="dev-postgres-01",
            region_id=us_east.id,
            name="dev-postgres-01",
            db_instance_class="db.t3.micro",
            status="stopped",
            engine="postgres",
            engine_version="14.9",
            allocated_storage=20,
            endpoint="dev-postgres-01.abc123.us-east-1.rds.amazonaws.com",
            port=5432,
            vpc_id="vpc-0a1b2c3d",
            availability_zone="us-east-1a",
            multi_az=False,
            tags=json.dumps({"Environment": "development", "Team": "backend"}),
            tf_managed=False,
        ),
        # US West database
        RDSInstance(
            db_instance_identifier="prod-postgres-west-01",
            region_id=us_west.id,
            name="prod-postgres-west-01",
            db_instance_class="db.t3.medium",
            status="available",
            engine="postgres",
            engine_version="15.4",
            allocated_storage=100,
            endpoint="prod-postgres-west-01.def456.us-west-2.rds.amazonaws.com",
            port=5432,
            vpc_id="vpc-1b2c3d4e",
            availability_zone="us-west-2a",
            multi_az=True,
            tags=json.dumps({"Environment": "production", "Team": "platform"}),
            tf_managed=True,
            tf_state_source="lab/databases/terraform.tfstate",
            tf_resource_address="aws_db_instance.main_west",
        ),
    ]

    for instance in instances:
        session.add(instance)

    await session.commit()
    logger.info(f"✓ Created {len(instances)} RDS instances")


async def seed_sync_status(session):
    """Create sample sync status entries."""
    statuses = [
        SyncStatus(
            source="ec2",
            last_synced_at=datetime.utcnow() - timedelta(minutes=5),
            status="success",
            resource_count=5,
        ),
        SyncStatus(
            source="rds",
            last_synced_at=datetime.utcnow() - timedelta(minutes=3),
            status="success",
            resource_count=4,
        ),
        SyncStatus(
            source="terraform_states",
            last_synced_at=datetime.utcnow() - timedelta(minutes=10),
            status="success",
            resource_count=6,
        ),
    ]

    for status in statuses:
        session.add(status)

    await session.commit()
    logger.info(f"✓ Created {len(statuses)} sync status entries")


async def main():
    """Seed the database with sample data."""
    settings = get_settings()

    logger.info("Seeding database with sample data...")
    logger.info(f"Database URL: {settings.database_url}")

    try:
        # Ensure database is initialized
        await init_db()

        async with async_session_maker() as session:
            # Check if data already exists
            result = await session.execute(select(Region))
            existing_regions = result.scalars().all()

            if existing_regions:
                logger.warning("Database already contains data")
                response = input("Clear existing data and reseed? (yes/no): ")
                if response.lower() != "yes":
                    logger.info("Seeding cancelled")
                    return

                # Clear existing data
                from app.models.database import Base, engine

                async with engine.begin() as conn:
                    await conn.run_sync(Base.metadata.drop_all)
                    await conn.run_sync(Base.metadata.create_all)
                logger.info("✓ Existing data cleared")

            # Seed data
            regions = await seed_regions(session)
            await seed_vpcs(session, regions)
            await seed_subnets(session, regions)
            await seed_internet_gateways(session, regions)
            await seed_nat_gateways(session, regions)
            await seed_elastic_ips(session, regions)
            await seed_ec2_instances(session, regions)
            await seed_rds_instances(session, regions)
            await seed_ecs_containers(session, regions)
            await seed_sync_status(session)

        logger.info("✓ Database seeding complete!")
        logger.info("\nSummary:")
        logger.info("  - 3 regions")
        logger.info("  - 2 VPCs (Terraform-managed)")
        logger.info("  - 5 subnets (Terraform-managed)")
        logger.info("  - 2 Internet Gateways (Terraform-managed)")
        logger.info("  - 1 NAT Gateway (Terraform-managed)")
        logger.info("  - 2 Elastic IPs (Terraform-managed)")
        logger.info("  - 5 EC2 instances (3 Terraform-managed)")
        logger.info("  - 4 RDS instances (3 Terraform-managed)")
        logger.info("  - 4 ECS containers (Terraform-managed)")
        logger.info("  - 3 sync status entries")

    except Exception as e:
        logger.error(f"✗ Failed to seed database: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
