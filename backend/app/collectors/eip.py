"""
Elastic IP collector.

Collects Elastic IP address data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class ElasticIPCollector(BaseCollector):
    """Collector for Elastic IPs."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all Elastic IPs from the configured region.

        Returns:
            List of Elastic IP data dictionaries
        """
        logger.info(f"Collecting Elastic IPs from region: {self.region}")
        elastic_ips = []

        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_addresses()

            for eip in response.get("Addresses", []):
                eip_data = self._parse_elastic_ip(eip)
                if eip_data:
                    elastic_ips.append(eip_data)

            logger.info(f"Collected {len(elastic_ips)} Elastic IPs from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"Elastic IP collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting Elastic IPs: {e}")

        return elastic_ips

    def _parse_elastic_ip(self, eip: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an Elastic IP response into a normalized dictionary.

        Args:
            eip: Raw Elastic IP data from boto3

        Returns:
            Normalized Elastic IP dictionary, or None if parsing fails
        """
        try:
            tags = eip.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)

            # AllocationId is required for VPC EIPs
            allocation_id = eip.get("AllocationId")
            if not allocation_id:
                # Skip EC2-Classic EIPs (they don't have AllocationId)
                logger.debug(f"Skipping EC2-Classic EIP: {eip.get('PublicIp')}")
                return None

            return {
                "allocation_id": allocation_id,
                "name": self._extract_name_from_tags(tags),
                "public_ip": eip.get("PublicIp", ""),
                "private_ip": eip.get("PrivateIpAddress"),
                "association_id": eip.get("AssociationId"),
                "instance_id": eip.get("InstanceId"),
                "network_interface_id": eip.get("NetworkInterfaceId"),
                "domain": eip.get("Domain", "vpc"),
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in Elastic IP data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing Elastic IP: {e}")
            return None

    async def collect_elastic_ip(self, allocation_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific Elastic IP by allocation ID.

        Args:
            allocation_id: The Elastic IP allocation ID

        Returns:
            Elastic IP data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_addresses(AllocationIds=[allocation_id])

            for eip in response.get("Addresses", []):
                return self._parse_elastic_ip(eip)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "InvalidAllocationID.NotFound":
                logger.warning(f"Elastic IP not found: {allocation_id}")
            else:
                self._handle_client_error(e, f"Elastic IP lookup: {allocation_id}")
        except Exception as e:
            logger.exception(f"Error collecting Elastic IP {allocation_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect Elastic IPs from all enabled regions.

    Returns:
        Combined list of Elastic IPs from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = ElasticIPCollector(region=settings.aws_region)
    return await collector.collect()
