"""
Internet Gateway collector.

Collects Internet Gateway data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class InternetGatewayCollector(BaseCollector):
    """Collector for Internet Gateways."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all Internet Gateways from the configured region.

        Returns:
            List of Internet Gateway data dictionaries
        """
        logger.info(f"Collecting Internet Gateways from region: {self.region}")
        igws = []

        try:
            ec2 = self._get_client("ec2")
            paginator = ec2.get_paginator("describe_internet_gateways")

            for page in paginator.paginate():
                for igw in page.get("InternetGateways", []):
                    igw_data = self._parse_igw(igw)
                    if igw_data:
                        igws.append(igw_data)

            logger.info(f"Collected {len(igws)} Internet Gateways from {self.region}")

        except ClientError as e:
            self._handle_client_error(
                e, f"Internet Gateway collection in {self.region}"
            )
        except Exception as e:
            logger.exception(f"Unexpected error collecting Internet Gateways: {e}")

        return igws

    def _parse_igw(self, igw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an Internet Gateway response into a normalized dictionary.

        Args:
            igw: Raw Internet Gateway data from boto3

        Returns:
            Normalized Internet Gateway dictionary, or None if parsing fails
        """
        try:
            tags = igw.get("Tags", [])
            tags_dict = self._tags_to_dict(tags)

            # Get attachment info (can have multiple VPC attachments, but usually just one)
            attachments = igw.get("Attachments", [])
            vpc_id = None
            state = "detached"

            if attachments:
                # Get the first attachment
                first_attachment = attachments[0]
                vpc_id = first_attachment.get("VpcId")
                state = first_attachment.get("State", "unknown")

            return {
                "igw_id": igw["InternetGatewayId"],
                "name": self._extract_name_from_tags(tags),
                "vpc_id": vpc_id,
                "state": state,
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in Internet Gateway data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing Internet Gateway: {e}")
            return None

    async def collect_igw(self, igw_id: str) -> Optional[Dict[str, Any]]:
        """
        Collect a specific Internet Gateway by ID.

        Args:
            igw_id: The Internet Gateway ID

        Returns:
            Internet Gateway data dictionary, or None if not found
        """
        try:
            ec2 = self._get_client("ec2")
            response = ec2.describe_internet_gateways(InternetGatewayIds=[igw_id])

            for igw in response.get("InternetGateways", []):
                return self._parse_igw(igw)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "InvalidInternetGatewayID.NotFound":
                logger.warning(f"Internet Gateway not found: {igw_id}")
            else:
                self._handle_client_error(e, f"Internet Gateway lookup: {igw_id}")
        except Exception as e:
            logger.exception(f"Error collecting Internet Gateway {igw_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect Internet Gateways from all enabled regions.

    Returns:
        Combined list of Internet Gateways from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    # TODO: Implement multi-region support
    collector = InternetGatewayCollector(region=settings.aws_region)
    return await collector.collect()
