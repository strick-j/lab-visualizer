"""
EC2 Instance collector.

Collects EC2 instance data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class EC2Collector(BaseCollector):
    """Collector for EC2 instances."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all EC2 instances from the configured region.

        Returns:
            List of EC2 instance data dictionaries
        """
        logger.info(f"Collecting EC2 instances from region: {self.region}")
        instances = []

        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_instances")

            for page in paginator.paginate():
                for reservation in page.get("Reservations", []):
                    for instance in reservation.get("Instances", []):
                        instance_data = self._parse_instance(instance)
                        if instance_data:
                            instances.append(instance_data)

            logger.info(f"Collected {len(instances)} EC2 instances from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"EC2 collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting EC2 instances: {e}")

        return instances

    def _parse_instance(self, instance: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an EC2 instance response into a normalized dictionary.

        Args:
            instance: Raw EC2 instance data from boto3

        Returns:
            Normalized instance dictionary, or None if parsing fails
        """
        try:
            state = instance.get("State", {}).get("Name", "unknown")

            tags = instance.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)

            return {
                "instance_id": instance["InstanceId"],
                "name": self._extract_name_from_tags(tags),
                "instance_type": instance.get("InstanceType", "unknown"),
                "state": state,
                "private_ip": instance.get("PrivateIpAddress"),
                "public_ip": instance.get("PublicIpAddress"),
                "private_dns": instance.get("PrivateDnsName"),
                "public_dns": instance.get("PublicDnsName"),
                "vpc_id": instance.get("VpcId"),
                "subnet_id": instance.get("SubnetId"),
                "availability_zone": instance.get("Placement", {}).get(
                    "AvailabilityZone"
                ),
                "launch_time": instance.get("LaunchTime"),
                "tags": tags_dict,
                "platform": self._normalize_platform(
                    instance.get("Platform"),
                    instance.get("PlatformDetails"),
                ),
                "region": self.region,
                # Additional metadata
                "image_id": instance.get("ImageId"),
                "key_name": instance.get("KeyName"),
                "security_groups": [
                    sg.get("GroupId") for sg in instance.get("SecurityGroups", [])
                ],
            }

        except KeyError as e:
            logger.warning(f"Missing required field in EC2 instance data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing EC2 instance: {e}")
            return None

    @staticmethod
    def _normalize_platform(
        platform: Optional[str], platform_details: Optional[str]
    ) -> str:
        """Normalize EC2 platform to 'windows' or 'linux'.

        AWS sets Platform to "windows" for Windows instances and omits
        the field entirely for Linux/UNIX instances.  PlatformDetails
        provides more granularity but we only need the OS family.
        """
        if platform and platform.lower() == "windows":
            return "windows"
        if platform_details and "windows" in platform_details.lower():
            return "windows"
        return "linux"

    async def collect_instance(self, instance_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific EC2 instance by ID.

        Args:
            instance_id: The EC2 instance ID

        Returns:
            Instance data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_instances(InstanceIds=[instance_id])

            for reservation in response.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    return self._parse_instance(instance)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "InvalidInstanceID.NotFound":
                logger.warning(f"EC2 instance not found: {instance_id}")
            else:
                self._handle_client_error(e, f"EC2 instance lookup: {instance_id}")
        except Exception as e:
            logger.exception(f"Error collecting EC2 instance {instance_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect EC2 instances from all enabled regions.

    Returns:
        Combined list of instances from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = EC2Collector(region=settings.aws_region)
    return await collector.collect()
