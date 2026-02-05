"""
RDS Instance collector.

Collects RDS database instance data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class RDSCollector(BaseCollector):
    """Collector for RDS database instances."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all RDS instances from the configured region.

        Returns:
            List of RDS instance data dictionaries
        """
        logger.info(f"Collecting RDS instances from region: {self.region}")
        instances = []

        try:
            rds = self._get_client("rds")
            paginator = rds.get_paginator("describe_db_instances")

            for page in paginator.paginate():
                for db_instance in page.get("DBInstances", []):
                    instance_data = await self._parse_instance(db_instance)
                    if instance_data:
                        instances.append(instance_data)

            logger.info(f"Collected {len(instances)} RDS instances from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"RDS collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting RDS instances: {e}")

        return instances

    async def _parse_instance(
        self, db_instance: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Parse an RDS instance response into a normalized dictionary.

        Args:
            db_instance: Raw RDS instance data from boto3

        Returns:
            Normalized instance dictionary, or None if parsing fails
        """
        try:
            db_identifier = db_instance["DBInstanceIdentifier"]

            # Get endpoint info
            endpoint = db_instance.get("Endpoint", {})

            # Get tags (requires a separate API call)
            tags_dict = await self._get_instance_tags(db_instance.get("DBInstanceArn"))

            return {
                "db_instance_identifier": db_identifier,
                "name": tags_dict.get("Name", db_identifier),
                "db_instance_class": db_instance.get("DBInstanceClass", "unknown"),
                "status": db_instance.get("DBInstanceStatus", "unknown"),
                "engine": db_instance.get("Engine", "unknown"),
                "engine_version": db_instance.get("EngineVersion", "unknown"),
                "allocated_storage": db_instance.get("AllocatedStorage", 0),
                "endpoint": endpoint.get("Address"),
                "port": endpoint.get("Port"),
                "vpc_id": db_instance.get("DBSubnetGroup", {}).get("VpcId"),
                "availability_zone": db_instance.get("AvailabilityZone"),
                "multi_az": db_instance.get("MultiAZ", False),
                "tags": tags_dict,
                "region": self.region,
                # Additional metadata
                "storage_type": db_instance.get("StorageType"),
                "storage_encrypted": db_instance.get("StorageEncrypted", False),
                "publicly_accessible": db_instance.get("PubliclyAccessible", False),
                "db_subnet_group": db_instance.get("DBSubnetGroup", {}).get(
                    "DBSubnetGroupName"
                ),
                "backup_retention_period": db_instance.get("BackupRetentionPeriod", 0),
            }

        except KeyError as e:
            logger.warning(f"Missing required field in RDS instance data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing RDS instance: {e}")
            return None

    async def _get_instance_tags(
        self, db_instance_arn: Optional[str]
    ) -> Dict[str, str]:
        """
        Get tags for an RDS instance.

        Args:
            db_instance_arn: The ARN of the RDS instance

        Returns:
            Dictionary of tag key-value pairs
        """
        if not db_instance_arn:
            return {}

        try:
            rds = self._get_client("rds")
            response = rds.list_tags_for_resource(ResourceName=db_instance_arn)
            tags = response.get("TagList", [])
            return {tag["Key"]: tag.get("Value", "") for tag in tags}

        except ClientError as e:
            logger.warning(f"Failed to get tags for {db_instance_arn}: {e}")
            return {}
        except Exception as e:
            logger.warning(f"Error getting RDS tags: {e}")
            return {}

    async def collect_instance(self, db_identifier: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific RDS instance by identifier.

        Args:
            db_identifier: The RDS DB instance identifier

        Returns:
            Instance data dictionary, or None if not found
        """
        try:
            rds = self._get_client("rds")
            response = rds.describe_db_instances(DBInstanceIdentifier=db_identifier)

            for db_instance in response.get("DBInstances", []):
                return await self._parse_instance(db_instance)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "DBInstanceNotFound":
                logger.warning(f"RDS instance not found: {db_identifier}")
            else:
                self._handle_client_error(e, f"RDS instance lookup: {db_identifier}")
        except Exception as e:
            logger.exception(f"Error collecting RDS instance {db_identifier}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect RDS instances from all enabled regions.

    Returns:
        Combined list of instances from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = RDSCollector(region=settings.aws_region)
    return await collector.collect()
