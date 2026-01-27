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
from app.models.resources import EC2Instance, RDSInstance, Region, SyncStatus

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
            await seed_ec2_instances(session, regions)
            await seed_rds_instances(session, regions)
            await seed_sync_status(session)

        logger.info("✓ Database seeding complete!")
        logger.info("\nSummary:")
        logger.info("  - 3 regions")
        logger.info("  - 5 EC2 instances (3 Terraform-managed)")
        logger.info("  - 4 RDS instances (3 Terraform-managed)")
        logger.info("  - 3 sync status entries")

    except Exception as e:
        logger.error(f"✗ Failed to seed database: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
