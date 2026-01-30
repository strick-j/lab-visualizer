"""
NAT Gateway collector.

Collects NAT Gateway data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class NATGatewayCollector(BaseCollector):
    """Collector for NAT Gateways."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all NAT Gateways from the configured region.

        Returns:
            List of NAT Gateway data dictionaries
        """
        logger.info(f"Collecting NAT Gateways from region: {self.region}")
        nat_gateways = []

        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_nat_gateways")

            for page in paginator.paginate():
                for nat_gw in page.get("NatGateways", []):
                    nat_gw_data = self._parse_nat_gateway(nat_gw)
                    if nat_gw_data:
                        nat_gateways.append(nat_gw_data)

            logger.info(f"Collected {len(nat_gateways)} NAT Gateways from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"NAT Gateway collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting NAT Gateways: {e}")

        return nat_gateways

    def _parse_nat_gateway(self, nat_gw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse a NAT Gateway response into a normalized dictionary.

        Args:
            nat_gw: Raw NAT Gateway data from boto3

        Returns:
            Normalized NAT Gateway dictionary, or None if parsing fails
        """
        try:
            tags = nat_gw.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)

            # Extract primary addresses
            primary_private_ip = None
            primary_public_ip = None
            allocation_id = None
            network_interface_id = None

            nat_gateway_addresses = nat_gw.get("NatGatewayAddresses", [])
            if nat_gateway_addresses:
                # Get the first address as primary
                primary_addr = nat_gateway_addresses[0]
                primary_private_ip = primary_addr.get("PrivateIp")
                primary_public_ip = primary_addr.get("PublicIp")
                allocation_id = primary_addr.get("AllocationId")
                network_interface_id = primary_addr.get("NetworkInterfaceId")

            return {
                "nat_gateway_id": nat_gw["NatGatewayId"],
                "name": self._extract_name_from_tags(tags),
                "vpc_id": nat_gw.get("VpcId"),
                "subnet_id": nat_gw.get("SubnetId"),
                "state": nat_gw.get("State", "unknown"),
                "connectivity_type": nat_gw.get("ConnectivityType", "public"),
                "primary_private_ip": primary_private_ip,
                "primary_public_ip": primary_public_ip,
                "allocation_id": allocation_id,
                "network_interface_id": network_interface_id,
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in NAT Gateway data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing NAT Gateway: {e}")
            return None

    async def collect_nat_gateway(self, nat_gateway_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific NAT Gateway by ID.

        Args:
            nat_gateway_id: The NAT Gateway ID

        Returns:
            NAT Gateway data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_nat_gateways(NatGatewayIds=[nat_gateway_id])

            for nat_gw in response.get("NatGateways", []):
                return self._parse_nat_gateway(nat_gw)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "NatGatewayNotFound":
                logger.warning(f"NAT Gateway not found: {nat_gateway_id}")
            else:
                self._handle_client_error(e, f"NAT Gateway lookup: {nat_gateway_id}")
        except Exception as e:
            logger.exception(f"Error collecting NAT Gateway {nat_gateway_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect NAT Gateways from all enabled regions.

    Returns:
        Combined list of NAT Gateways from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = NATGatewayCollector(region=settings.aws_region)
    return await collector.collect()
