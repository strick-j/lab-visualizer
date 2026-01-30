"""
Terraform state file parser.

Parses Terraform state files from S3 to extract resource information
and track which resources are managed by Terraform.
"""

import json
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class TerraformResource:
    """Represents a resource extracted from Terraform state."""

    resource_type: str
    resource_id: str
    resource_address: str
    state_source: str
    attributes: Dict[str, Any]


@dataclass
class TerraformStateFile:
    """Represents a Terraform state file."""

    name: str
    key: str
    description: Optional[str]
    last_modified: Optional[datetime]
    resource_count: int
    status: str
    resources: List[TerraformResource]


class TerraformStateParser:
    """Parser for Terraform state files stored in S3."""

    # Resource types we care about
    SUPPORTED_RESOURCE_TYPES = {
        "aws_instance": "ec2",
        "aws_db_instance": "rds",
        "aws_vpc": "vpc",
        "aws_subnet": "subnet",
        "aws_internet_gateway": "igw",
        "aws_nat_gateway": "nat_gateway",
        "aws_eip": "eip",
    }

    def __init__(self, bucket: Optional[str] = None):
        """
        Initialize the parser.

        Args:
            bucket: S3 bucket name containing state files
        """
        self.bucket = bucket or settings.tf_state_bucket
        self._s3_client = None

    @property
    def s3_client(self):
        """Get or create S3 client."""
        if self._s3_client is None:
            session_kwargs = {}
            if settings.aws_profile:
                session_kwargs["profile_name"] = settings.aws_profile
            session = boto3.Session(**session_kwargs)
            self._s3_client = session.client("s3", region_name=settings.aws_region)
        return self._s3_client

    async def parse_state_file(
        self, key: str, name: str = "", description: str = ""
    ) -> TerraformStateFile:
        """
        Parse a single Terraform state file from S3.

        Args:
            key: S3 object key for the state file
            name: Human-readable name for this state
            description: Description of what this state manages

        Returns:
            TerraformStateFile with parsed resources
        """
        logger.info(f"Parsing Terraform state: {key}")

        try:
            # Get state file from S3
            response = self.s3_client.get_object(Bucket=self.bucket, Key=key)
            last_modified = response.get("LastModified")
            state_content = response["Body"].read().decode("utf-8")
            state_data = json.loads(state_content)

            # Parse resources
            resources = self._extract_resources(state_data, key)

            return TerraformStateFile(
                name=name or key,
                key=key,
                description=description,
                last_modified=last_modified,
                resource_count=len(resources),
                status="synced",
                resources=resources,
            )

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            logger.error(f"Failed to fetch state file {key}: {error_code}")
            return TerraformStateFile(
                name=name or key,
                key=key,
                description=description,
                last_modified=None,
                resource_count=0,
                status="error",
                resources=[],
            )
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse state file {key}: {e}")
            return TerraformStateFile(
                name=name or key,
                key=key,
                description=description,
                last_modified=None,
                resource_count=0,
                status="invalid",
                resources=[],
            )
        except Exception as e:
            logger.exception(f"Unexpected error parsing state file {key}: {e}")
            return TerraformStateFile(
                name=name or key,
                key=key,
                description=description,
                last_modified=None,
                resource_count=0,
                status="error",
                resources=[],
            )

    def _extract_resources(
        self, state_data: Dict[str, Any], state_source: str
    ) -> List[TerraformResource]:
        """
        Extract resources from Terraform state data.

        Supports both Terraform 0.12+ state format (version 4).

        Args:
            state_data: Parsed Terraform state JSON
            state_source: Key of the source state file

        Returns:
            List of extracted TerraformResource objects
        """
        resources = []
        version = state_data.get("version", 0)

        if version >= 4:
            # Terraform 0.12+ format
            resources = self._extract_v4_resources(state_data, state_source)
        else:
            logger.warning(
                f"Unsupported Terraform state version: {version}. "
                "Only version 4+ is supported."
            )

        return resources

    def _extract_v4_resources(
        self, state_data: Dict[str, Any], state_source: str
    ) -> List[TerraformResource]:
        """
        Extract resources from Terraform state version 4 format.

        Args:
            state_data: Parsed Terraform state JSON
            state_source: Key of the source state file

        Returns:
            List of extracted TerraformResource objects
        """
        resources = []

        for resource_block in state_data.get("resources", []):
            resource_type = resource_block.get("type", "")

            # Skip resources we don't care about
            if resource_type not in self.SUPPORTED_RESOURCE_TYPES:
                continue

            mode = resource_block.get("mode", "managed")
            if mode != "managed":
                continue

            resource_name = resource_block.get("name", "")
            module = resource_block.get("module", "")

            # Build the resource address
            if module:
                base_address = f"{module}.{resource_type}.{resource_name}"
            else:
                base_address = f"{resource_type}.{resource_name}"

            # Handle instances (for count/for_each)
            for instance in resource_block.get("instances", []):
                attributes = instance.get("attributes", {})
                index_key = instance.get("index_key")

                # Build full address with index
                if index_key is not None:
                    if isinstance(index_key, int):
                        address = f"{base_address}[{index_key}]"
                    else:
                        address = f'{base_address}["{index_key}"]'
                else:
                    address = base_address

                # Extract resource ID based on type
                resource_id = self._extract_resource_id(resource_type, attributes)

                if resource_id:
                    resources.append(
                        TerraformResource(
                            resource_type=resource_type,
                            resource_id=resource_id,
                            resource_address=address,
                            state_source=state_source,
                            attributes=attributes,
                        )
                    )

        return resources

    def _extract_resource_id(
        self, resource_type: str, attributes: Dict[str, Any]
    ) -> Optional[str]:
        """
        Extract the AWS resource ID from Terraform attributes.

        Args:
            resource_type: Terraform resource type
            attributes: Resource attributes from state

        Returns:
            AWS resource ID, or None if not found
        """
        id_mappings = {
            "aws_instance": "id",  # EC2 instance ID
            "aws_db_instance": "identifier",  # RDS identifier
            "aws_vpc": "id",  # VPC ID
            "aws_subnet": "id",  # Subnet ID
            "aws_internet_gateway": "id",  # IGW ID
            "aws_nat_gateway": "id",  # NAT Gateway ID
            "aws_eip": "id",  # Elastic IP allocation ID
        }

        id_field = id_mappings.get(resource_type, "id")
        return attributes.get(id_field)


class TerraformStateAggregator:
    """Aggregates resources from multiple Terraform state files."""

    def __init__(self):
        """Initialize the aggregator."""
        self.parser = TerraformStateParser()
        self._state_config: Optional[Dict[str, Any]] = None

    async def load_config(self) -> List[Dict[str, Any]]:
        """
        Load Terraform state configuration.

        Returns:
            List of state file configurations
        """
        import yaml

        config_path = settings.tf_state_config

        # Try loading from YAML config file
        try:
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)
                return config.get("terraform_states", [])
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}")
        except yaml.YAMLError as e:
            logger.error(f"Failed to parse config file: {e}")

        # Fall back to environment variable
        if settings.tf_state_keys:
            keys = [k.strip() for k in settings.tf_state_keys.split(",")]
            return [{"name": key, "key": key} for key in keys]

        logger.warning("No Terraform state configuration found")
        return []

    async def aggregate_all(self) -> Dict[str, List[TerraformResource]]:
        """
        Aggregate resources from all configured state files.

        Returns:
            Dictionary mapping resource type to list of resources
        """
        state_configs = await self.load_config()
        all_resources: Dict[str, List[TerraformResource]] = {
            "ec2": [],
            "rds": [],
        }

        for config in state_configs:
            if not config.get("enabled", True):
                continue

            state_file = await self.parser.parse_state_file(
                key=config["key"],
                name=config.get("name", ""),
                description=config.get("description", ""),
            )

            for resource in state_file.resources:
                resource_category = TerraformStateParser.SUPPORTED_RESOURCE_TYPES.get(
                    resource.resource_type
                )
                if resource_category and resource_category in all_resources:
                    all_resources[resource_category].append(resource)

        # Log summary
        for category, resources in all_resources.items():
            logger.info(f"Aggregated {len(resources)} {category} resources from Terraform")

        return all_resources

    async def get_state_info(self) -> List[TerraformStateFile]:
        """
        Get information about all configured state files.

        Returns:
            List of TerraformStateFile objects with metadata
        """
        state_configs = await self.load_config()
        state_files = []

        for config in state_configs:
            if not config.get("enabled", True):
                continue

            state_file = await self.parser.parse_state_file(
                key=config["key"],
                name=config.get("name", ""),
                description=config.get("description", ""),
            )
            state_files.append(state_file)

        return state_files
