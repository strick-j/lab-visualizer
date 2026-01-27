"""
Base collector class for AWS resources.

Provides common functionality for all AWS data collectors.
"""

import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class BaseCollector(ABC):
    """Abstract base class for AWS resource collectors."""

    def __init__(self, region: Optional[str] = None):
        """
        Initialize the collector.

        Args:
            region: AWS region to collect from. Defaults to configured region.
        """
        self.region = region or settings.aws_region
        self._clients: Dict[str, Any] = {}

        # Configure boto3 with retries
        self.boto_config = Config(
            retries={"max_attempts": 3, "mode": "adaptive"},
            connect_timeout=10,
            read_timeout=30,
        )

    def _get_client(self, service_name: str) -> Any:
        """
        Get or create a boto3 client for the specified service.

        Args:
            service_name: AWS service name (e.g., 'ec2', 'rds')

        Returns:
            Boto3 client for the service
        """
        cache_key = f"{service_name}_{self.region}"
        if cache_key not in self._clients:
            session_kwargs = {}
            if settings.aws_profile:
                session_kwargs["profile_name"] = settings.aws_profile

            session = boto3.Session(**session_kwargs)
            self._clients[cache_key] = session.client(
                service_name,
                region_name=self.region,
                config=self.boto_config,
            )
        return self._clients[cache_key]

    @abstractmethod
    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect resources from AWS.

        Returns:
            List of resource dictionaries
        """
        pass

    def _extract_name_from_tags(self, tags: Optional[List[Dict]]) -> Optional[str]:
        """
        Extract the Name tag value from a list of AWS tags.

        Args:
            tags: List of tag dictionaries with 'Key' and 'Value' keys

        Returns:
            The value of the Name tag, or None if not found
        """
        if not tags:
            return None
        for tag in tags:
            if tag.get("Key") == "Name":
                return tag.get("Value")
        return None

    def _tags_to_dict(self, tags: Optional[List[Dict]]) -> Dict[str, str]:
        """
        Convert AWS tags list to a dictionary.

        Args:
            tags: List of tag dictionaries with 'Key' and 'Value' keys

        Returns:
            Dictionary of tag key-value pairs
        """
        if not tags:
            return {}
        return {tag["Key"]: tag.get("Value", "") for tag in tags}

    def _handle_client_error(self, error: ClientError, operation: str) -> None:
        """
        Handle boto3 ClientError with appropriate logging.

        Args:
            error: The ClientError exception
            operation: Description of the operation that failed
        """
        error_code = error.response.get("Error", {}).get("Code", "Unknown")
        error_message = error.response.get("Error", {}).get("Message", str(error))
        logger.error(f"{operation} failed: [{error_code}] {error_message}")
