"""
Subnet collector.

Collects Subnet data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class SubnetCollector(BaseCollector):
    """Collector for Subnets."""

    async def collect(
        self, route_tables: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """
        Collect all Subnets from the configured region.

        Args:
            route_tables: Optional list of route table data for subnet type classification

        Returns:
            List of Subnet data dictionaries
        """
        logger.info(f"Collecting Subnets from region: {self.region}")
        subnets = []

        # If route tables not provided, fetch them for classification
        if route_tables is None:
            route_tables = await self._collect_route_tables()

        if not route_tables:
            logger.warning(
                "No route tables found - all subnets will be classified as 'unknown'. "
                "Verify IAM permissions include ec2:DescribeRouteTables."
            )

        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_subnets")

            for page in paginator.paginate():
                for subnet in page.get("Subnets", []):
                    subnet_data = self._parse_subnet(subnet, route_tables)
                    if subnet_data:
                        subnets.append(subnet_data)

            logger.info(f"Collected {len(subnets)} Subnets from {self.region}")

        except ClientError as e:
            self._handle_client_error(e, f"Subnet collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting Subnets: {e}")

        return subnets

    async def _collect_route_tables(self) -> List[Dict[str, Any]]:
        """
        Collect route tables for subnet type classification.

        Returns:
            List of route table dictionaries
        """
        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_route_tables")
            route_tables = []

            for page in paginator.paginate():
                route_tables.extend(page.get("RouteTables", []))

            return route_tables

        except ClientError as e:
            self._handle_client_error(e, f"Route table collection in {self.region}")
            return []
        except Exception as e:
            logger.exception(f"Unexpected error collecting route tables: {e}")
            return []

    def _determine_subnet_type(
        self, subnet_id: str, route_tables: List[Dict[str, Any]]
    ) -> str:
        """
        Determine if subnet is public, private, or unknown based on route table.

        A subnet is public if it has a route to an Internet Gateway (0.0.0.0/0 → igw-*).
        A subnet is private if it has a route table (explicit or main) without an IGW route.

        Args:
            subnet_id: The subnet ID
            route_tables: List of route table data

        Returns:
            'public', 'private', or 'unknown'
        """
        try:
            # First pass: look for explicit subnet association
            for rt in route_tables:
                for assoc in rt.get("Associations", []):
                    if assoc.get("SubnetId") == subnet_id:
                        # Found explicit route table for this subnet
                        # Check routes for Internet Gateway
                        for route in rt.get("Routes", []):
                            dest_cidr = route.get("DestinationCidrBlock", "")
                            gateway_id = route.get("GatewayId", "")

                            # Public subnet has route to IGW for 0.0.0.0/0
                            if dest_cidr == "0.0.0.0/0" and gateway_id.startswith(
                                "igw-"
                            ):
                                return "public"

                        # Explicit route table without IGW route = private
                        return "private"

            # Second pass: check main route table (implicit association)
            for rt in route_tables:
                for assoc in rt.get("Associations", []):
                    if assoc.get("Main", False):
                        # Found main route table - check for IGW route
                        for route in rt.get("Routes", []):
                            dest_cidr = route.get("DestinationCidrBlock", "")
                            gateway_id = route.get("GatewayId", "")

                            # Public subnet has route to IGW for 0.0.0.0/0
                            if dest_cidr == "0.0.0.0/0" and gateway_id.startswith(
                                "igw-"
                            ):
                                return "public"

                        # Main route table without IGW route = private
                        return "private"

            # Default to unknown if we couldn't find any route table
            return "unknown"

        except Exception as e:
            logger.warning(f"Error determining subnet type for {subnet_id}: {e}")
            return "unknown"

    def _parse_subnet(
        self, subnet: Dict[str, Any], route_tables: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Parse a Subnet response into a normalized dictionary.

        Args:
            subnet: Raw Subnet data from boto3
            route_tables: Route table data for classification

        Returns:
            Normalized Subnet dictionary, or None if parsing fails
        """
        try:
            tags = subnet.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)
            subnet_id = subnet["SubnetId"]

            # Determine subnet type
            subnet_type = self._determine_subnet_type(subnet_id, route_tables)

            return {
                "subnet_id": subnet_id,
                "name": self._extract_name_from_tags(tags),
                "vpc_id": subnet["VpcId"],
                "cidr_block": subnet["CidrBlock"],
                "availability_zone": subnet["AvailabilityZone"],
                "subnet_type": subnet_type,
                "state": subnet.get("State", "unknown"),
                "available_ip_count": subnet.get("AvailableIpAddressCount", 0),
                "map_public_ip_on_launch": subnet.get("MapPublicIpOnLaunch", False),
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in Subnet data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing Subnet: {e}")
            return None

    async def collect_subnet(self, subnet_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific Subnet by ID.

        Args:
            subnet_id: The Subnet ID

        Returns:
            Subnet data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_subnets(SubnetIds=[subnet_id])

            # Fetch route tables for classification
            route_tables = await self._collect_route_tables()

            for subnet in response.get("Subnets", []):
                return self._parse_subnet(subnet, route_tables)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "InvalidSubnetID.NotFound":
                logger.warning(f"Subnet not found: {subnet_id}")
            else:
                self._handle_client_error(e, f"Subnet lookup: {subnet_id}")
        except Exception as e:
            logger.exception(f"Error collecting Subnet {subnet_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect Subnets from all enabled regions.

    Returns:
        Combined list of Subnets from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = SubnetCollector(region=settings.aws_region)
    return await collector.collect()
