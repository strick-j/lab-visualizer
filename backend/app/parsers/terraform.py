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
    bucket: Optional[str]
    description: Optional[str]
    last_modified: Optional[datetime]
    resource_count: int
    status: str
    resources: List[TerraformResource]


class TerraformStateParser:
    """Parser for Terraform state files stored in S3."""

    # AWS resource types we care about (static)
    SUPPORTED_RESOURCE_TYPES = {
        "aws_instance": "ec2",
        "aws_db_instance": "rds",
        "aws_vpc": "vpc",
        "aws_subnet": "subnet",
        "aws_internet_gateway": "igw",
        "aws_nat_gateway": "nat_gateway",
        "aws_eip": "eip",
        "aws_ecs_cluster": "ecs_cluster",
        "aws_ecs_service": "ecs_service",
        "aws_ecs_task_definition": "ecs_task_definition",
    }

    @classmethod
    def get_all_supported_types(cls) -> Dict[str, str]:
        """Get all supported resource types including CyberArk types.

        CyberArk resource type names are configurable via settings
        since the idsec provider may use different naming conventions.
        """
        types = dict(cls.SUPPORTED_RESOURCE_TYPES)
        if settings.cyberark_enabled:
            types[settings.cyberark_tf_safe_type] = "cyberark_safe"
            types[settings.cyberark_tf_account_type] = "cyberark_account"
            types[settings.cyberark_tf_role_type] = "cyberark_role"
            types[settings.cyberark_tf_sia_vm_policy_type] = "cyberark_sia_vm_policy"
            types[settings.cyberark_tf_sia_db_policy_type] = "cyberark_sia_db_policy"
        return types

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
        logger.info("Parsing Terraform state: %s", key)

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
                bucket=self.bucket,
                description=description,
                last_modified=last_modified,
                resource_count=len(resources),
                status="synced",
                resources=resources,
            )

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            logger.error("Failed to fetch state file %s: %s", key, error_code)
            return TerraformStateFile(
                name=name or key,
                key=key,
                bucket=self.bucket,
                description=description,
                last_modified=None,
                resource_count=0,
                status="error",
                resources=[],
            )
        except json.JSONDecodeError as e:
            logger.error("Failed to parse state file %s: %s", key, e)
            return TerraformStateFile(
                name=name or key,
                key=key,
                bucket=self.bucket,
                description=description,
                last_modified=None,
                resource_count=0,
                status="invalid",
                resources=[],
            )
        except Exception:
            logger.exception("Unexpected error parsing state file %s", key)
            return TerraformStateFile(
                name=name or key,
                key=key,
                bucket=self.bucket,
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
                "Unsupported Terraform state version: %s. "
                "Only version 4+ is supported.",
                version,
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
            all_types = self.get_all_supported_types()
            if resource_type not in all_types:
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
            "aws_ecs_cluster": "name",  # ECS cluster name
            "aws_ecs_service": "name",  # ECS service name
            "aws_ecs_task_definition": "family",  # Task definition family
        }

        # Add CyberArk resource ID mappings (configurable type names)
        if settings.cyberark_enabled:
            id_mappings[settings.cyberark_tf_safe_type] = "safe_name"
            id_mappings[settings.cyberark_tf_account_type] = "id"
            id_mappings[settings.cyberark_tf_role_type] = "name"
            id_mappings[settings.cyberark_tf_sia_vm_policy_type] = "name"
            id_mappings[settings.cyberark_tf_sia_db_policy_type] = "name"

        id_field = id_mappings.get(resource_type, "id")
        return attributes.get(id_field)


class TerraformStateAggregator:
    """Aggregates resources from multiple Terraform state files."""

    def __init__(self):
        """Initialize the aggregator."""
        self._state_config: Optional[Dict[str, Any]] = None

    def _get_parser(self, bucket: Optional[str] = None) -> TerraformStateParser:
        """Get a parser for the given bucket."""
        return TerraformStateParser(bucket=bucket)

    async def _load_db_buckets(self) -> List[Dict[str, Any]]:
        """
        Load Terraform state bucket configurations from the database,
        including any explicitly configured paths per bucket.

        Returns:
            List of bucket configurations with bucket_name, region, prefix,
            and a list of explicit paths.
        """
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        from app.models.database import async_session_maker
        from app.models.resources import TerraformStateBucket

        buckets = []
        try:
            async with async_session_maker() as session:
                result = await session.execute(
                    select(TerraformStateBucket)
                    .options(selectinload(TerraformStateBucket.paths))
                    .where(TerraformStateBucket.enabled == True)  # noqa: E712
                )
                for row in result.scalars().unique().all():
                    explicit_paths = [
                        {
                            "key": p.path,
                            "name": p.path,
                            "description": p.description or "",
                            "enabled": p.enabled,
                        }
                        for p in row.paths
                    ]
                    buckets.append(
                        {
                            "bucket_name": row.bucket_name,
                            "region": row.region,
                            "prefix": row.prefix,
                            "description": row.description,
                            "source": row.source,
                            "explicit_paths": explicit_paths,
                        }
                    )
        except Exception as e:
            logger.warning("Failed to load buckets from database: %s", e)

        return buckets

    async def load_config(self) -> List[Dict[str, Any]]:
        """
        Load Terraform state configuration.

        Returns:
            List of state file configurations
        """
        import yaml  # type: ignore[import-untyped]

        config_path = settings.tf_state_config

        # Try loading from YAML config file
        try:
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)
                result: list[dict[str, Any]] = config.get("terraform_states", [])
                return result
        except FileNotFoundError:
            logger.warning("Config file not found: %s", config_path)
        except yaml.YAMLError as e:
            logger.error("Failed to parse config file: %s", e)

        # Fall back to environment variable
        if settings.tf_state_keys:
            keys = [k.strip() for k in settings.tf_state_keys.split(",")]
            return [{"name": key, "key": key} for key in keys]

        logger.warning("No Terraform state configuration found")
        return []

    async def _get_all_bucket_configs(
        self,
    ) -> List[Dict[str, Any]]:
        """
        Build a combined list of bucket entries.  Each entry has:
        - bucket_name: S3 bucket name
        - region: optional AWS region override
        - state_configs: list of state file configs for that bucket

        Resolution order per DB bucket:
        1. If explicit paths are configured -> use those (no auto-discovery)
        2. Otherwise -> auto-discover .tfstate files under the prefix

        For "env"-sourced buckets, YAML configs are also merged in alongside
        any explicit paths / auto-discovery results.
        """
        entries: List[Dict[str, Any]] = []
        db_buckets = await self._load_db_buckets()

        # Track whether the legacy env bucket is already covered by DB
        env_bucket_handled = False

        for db_bucket in db_buckets:
            bucket_name = db_bucket["bucket_name"]
            prefix = db_bucket.get("prefix") or ""
            region = db_bucket.get("region")
            source = db_bucket.get("source", "manual")
            explicit_paths = db_bucket.get("explicit_paths", [])

            state_configs: List[Dict[str, Any]] = []

            # For env-sourced buckets, include YAML configs first
            if source == "env" and bucket_name == settings.tf_state_bucket:
                env_bucket_handled = True
                yaml_configs = await self.load_config()
                state_configs.extend(yaml_configs)

            if explicit_paths:
                # Use explicitly configured paths
                state_configs.extend(explicit_paths)
            elif not state_configs:
                # No explicit paths and no YAML -> auto-discover
                discovered = await self._discover_state_files(
                    bucket_name, prefix, region
                )
                state_configs.extend(discovered)

            if state_configs:
                entries.append(
                    {
                        "bucket_name": bucket_name,
                        "region": region,
                        "state_configs": state_configs,
                    }
                )

        # Fallback: if TF_STATE_BUCKET is set but not in DB, still honour
        # the YAML / env-key config (backwards-compat)
        if not env_bucket_handled and settings.tf_state_bucket:
            yaml_configs = await self.load_config()
            if yaml_configs:
                entries.append(
                    {
                        "bucket_name": settings.tf_state_bucket,
                        "region": None,
                        "state_configs": yaml_configs,
                    }
                )

        return entries

    async def _discover_state_files(
        self, bucket_name: str, prefix: str, region: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Discover .tfstate files in an S3 bucket under the given prefix.

        Args:
            bucket_name: S3 bucket name
            prefix: Key prefix to search under
            region: AWS region for the S3 client

        Returns:
            List of state file configurations
        """
        try:
            session_kwargs: Dict[str, Any] = {}
            if settings.aws_profile:
                session_kwargs["profile_name"] = settings.aws_profile
            session = boto3.Session(**session_kwargs)
            s3_client = session.client("s3", region_name=region or settings.aws_region)

            state_files: List[Dict[str, Any]] = []
            paginator = s3_client.get_paginator("list_objects_v2")

            for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    if (
                        key.endswith(".tfstate")
                        and "/archive/" not in key
                        and "/backup/" not in key
                    ):
                        # Derive a human-readable name from the key
                        name = key
                        if prefix and key.startswith(prefix):
                            name = key[len(prefix) :].lstrip("/")
                        state_files.append(
                            {
                                "name": name,
                                "key": key,
                                "description": f"State file from s3://{bucket_name}/{key}",
                                "enabled": True,
                            }
                        )

            logger.info(
                "Discovered %d state files in s3://%s/%s",
                len(state_files),
                bucket_name,
                prefix,
            )
            return state_files

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            logger.error(
                "Failed to list state files in s3://%s/%s: %s",
                bucket_name,
                prefix,
                error_code,
            )
            return []
        except Exception:
            logger.exception(
                "Unexpected error discovering state files in s3://%s/%s",
                bucket_name,
                prefix,
            )
            return []

    async def aggregate_all(self) -> Dict[str, List[TerraformResource]]:
        """
        Aggregate resources from all configured state files across all buckets.

        Returns:
            Dictionary mapping resource type to list of resources
        """
        all_resources: Dict[str, List[TerraformResource]] = {
            "ec2": [],
            "rds": [],
            "vpc": [],
            "subnet": [],
            "igw": [],
            "nat_gateway": [],
            "eip": [],
            "ecs_cluster": [],
            "ecs_service": [],
            "ecs_task_definition": [],
        }

        # Add CyberArk categories when enabled
        if settings.cyberark_enabled:
            all_resources.update(
                {
                    "cyberark_safe": [],
                    "cyberark_account": [],
                    "cyberark_role": [],
                    "cyberark_sia_vm_policy": [],
                    "cyberark_sia_db_policy": [],
                }
            )

        bucket_entries = await self._get_all_bucket_configs()

        for entry in bucket_entries:
            bucket_name = entry["bucket_name"]
            region = entry.get("region")
            parser = self._get_parser(bucket=bucket_name)
            # Override region if specified per bucket
            if region:
                session_kwargs: Dict[str, Any] = {}
                if settings.aws_profile:
                    session_kwargs["profile_name"] = settings.aws_profile
                session = boto3.Session(**session_kwargs)
                parser._s3_client = session.client("s3", region_name=region)

            for config in entry["state_configs"]:
                if not config.get("enabled", True):
                    continue

                state_file = await parser.parse_state_file(
                    key=config["key"],
                    name=config.get("name", ""),
                    description=config.get("description", ""),
                )

                all_types = TerraformStateParser.get_all_supported_types()
                for resource in state_file.resources:
                    resource_category = all_types.get(resource.resource_type)
                    if resource_category and resource_category in all_resources:
                        all_resources[resource_category].append(resource)

        # Log summary
        for category, resources in all_resources.items():
            logger.info(
                "Aggregated %d %s resources from Terraform",
                len(resources),
                category,
            )

        return all_resources

    async def get_state_info(self) -> List[TerraformStateFile]:
        """
        Get information about all configured state files across all buckets.

        Returns:
            List of TerraformStateFile objects with metadata
        """
        state_files: List[TerraformStateFile] = []
        bucket_entries = await self._get_all_bucket_configs()

        for entry in bucket_entries:
            bucket_name = entry["bucket_name"]
            region = entry.get("region")
            parser = self._get_parser(bucket=bucket_name)
            if region:
                session_kwargs: Dict[str, Any] = {}
                if settings.aws_profile:
                    session_kwargs["profile_name"] = settings.aws_profile
                session = boto3.Session(**session_kwargs)
                parser._s3_client = session.client("s3", region_name=region)

            for config in entry["state_configs"]:
                if not config.get("enabled", True):
                    continue

                state_file = await parser.parse_state_file(
                    key=config["key"],
                    name=config.get("name", ""),
                    description=config.get("description", ""),
                )
                state_files.append(state_file)

        return state_files
