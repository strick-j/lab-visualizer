"""
VPC collector.

Collects VPC data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class VPCCollector(BaseCollector):
    """Collector for VPCs."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all VPCs from the configured region.

        Returns:
            List of VPC data dictionaries
        """
        logger.info(f"Collecting VPCs from region: {self.region}")
        vpcs = []

        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_vpcs")

            for page in paginator.paginate():
                for vpc in page.get("Vpcs", []):
                    vpc_data = self._parse_vpc(vpc)
                    if vpc_data:
                        vpcs.append(vpc_data)

            logger.info(f"Collected {len(vpcs)} VPCs from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"VPC collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting VPCs: {e}")

        return vpcs

    def _parse_vpc(self, vpc: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse a VPC response into a normalized dictionary.

        Args:
            vpc: Raw VPC data from boto3

        Returns:
            Normalized VPC dictionary, or None if parsing fails
        """
        try:
            tags = vpc.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)

            return {
                "vpc_id": vpc["VpcId"],
                "name": self._extract_name_from_tags(tags),
                "cidr_block": vpc["CidrBlock"],
                "state": vpc.get("State", "unknown"),
                "is_default": vpc.get("IsDefault", False),
                "enable_dns_support": vpc.get("EnableDnsSupport", True),
                "enable_dns_hostnames": vpc.get("EnableDnsHostnames", False),
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in VPC data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing VPC: {e}")
            return None

    async def collect_vpc(self, vpc_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific VPC by ID.

        Args:
            vpc_id: The VPC ID

        Returns:
            VPC data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_vpcs(VpcIds=[vpc_id])

            for vpc in response.get("Vpcs", []):
                return self._parse_vpc(vpc)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "InvalidVpcID.NotFound":
                logger.warning(f"VPC not found: {vpc_id}")
            else:
                self._handle_client_error(e, f"VPC lookup: {vpc_id}")
        except Exception as e:
            logger.exception(f"Error collecting VPC {vpc_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect VPCs from all enabled regions.

    Returns:
        Combined list of VPCs from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = VPCCollector(region=settings.aws_region)
    return await collector.collect()
