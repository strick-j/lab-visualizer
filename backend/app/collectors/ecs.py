"""
ECS Container collector.

Collects ECS task and container data from AWS using the boto3 SDK.
Detects management source (Terraform, GitHub Actions, unmanaged) based on
container image tags and resource tags.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)

# Patterns that indicate CI/CD deployment (GitHub Actions)
GITHUB_ACTIONS_PATTERNS = [
    re.compile(r"^[a-f0-9]{40}$"),  # Full git SHA
    re.compile(r"^[a-f0-9]{7,8}$"),  # Short git SHA
    re.compile(r"^v\d+\.\d+\.\d+"),  # Semver (v1.2.3)
]


class ECSCollector(BaseCollector):
    """Collector for ECS containers (tasks running in clusters)."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all ECS tasks from the configured region.

        Returns:
            List of ECS task/container data dictionaries
        """
        logger.info(f"Collecting ECS containers from region: {self.region}")
        containers: List[Dict[str, Any]] = []

        try:
            ecs = self._get_client("ecs")

            # List all clusters
            cluster_arns = []
            paginator = ecs.get_paginator("list_clusters")
            for page in paginator.paginate():
                cluster_arns.extend(page.get("clusterArns", []))

            if not cluster_arns:
                logger.info(f"No ECS clusters found in {self.region}")
                return containers

            for cluster_arn in cluster_arns:
                cluster_name = cluster_arn.rsplit("/", 1)[-1]

                # List tasks in each cluster
                task_arns = []
                task_paginator = ecs.get_paginator("list_tasks")
                for page in task_paginator.paginate(cluster=cluster_arn):
                    task_arns.extend(page.get("taskArns", []))

                if not task_arns:
                    continue

                # Describe tasks in batches of 100 (API limit)
                for i in range(0, len(task_arns), 100):
                    batch = task_arns[i : i + 100]
                    response = ecs.describe_tasks(
                        cluster=cluster_arn,
                        tasks=batch,
                        include=["TAGS"],
                    )

                    for task in response.get("tasks", []):
                        task_data = self._parse_task(task, cluster_name)
                        if task_data:
                            containers.append(task_data)

            logger.info(
                f"Collected {len(containers)} ECS containers from {self.region}"
            )

        except ClientError as e:
            self._handle_client_error(e, f"ECS collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting ECS containers: {e}")

        return containers

    def _parse_task(
        self, task: Dict[str, Any], cluster_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Parse an ECS task response into a normalized dictionary.

        Args:
            task: Raw ECS task data from boto3
            cluster_name: Name of the cluster the task belongs to

        Returns:
            Normalized task dictionary, or None if parsing fails
        """
        try:
            task_arn = task.get("taskArn", "")
            task_id = task_arn.rsplit("/", 1)[-1] if task_arn else "unknown"

            tags = task.get("tags", [])
            tags_dict = self._tags_to_dict(tags)

            # Extract container details from the first container
            containers = task.get("containers", [])
            container_name = None
            container_port = None
            image = None
            image_tag = None

            if containers:
                first_container = containers[0]
                container_name = first_container.get("name")
                image = first_container.get("image")
                # Extract image tag
                if image and ":" in image:
                    image_tag = image.split(":")[-1]
                network_bindings = first_container.get("networkBindings", [])
                if network_bindings:
                    container_port = network_bindings[0].get("containerPort")
                # Also check port mappings from network interfaces
                if not container_port:
                    network_interfaces = first_container.get("networkInterfaces", [])
                    if network_interfaces:
                        # Port info may not be directly available here
                        pass

            # Get network info from attachments
            subnet_id = None
            private_ip = None
            attachments = task.get("attachments", [])
            for attachment in attachments:
                if attachment.get("type") == "ElasticNetworkInterface":
                    for detail in attachment.get("details", []):
                        if detail.get("name") == "subnetId":
                            subnet_id = detail.get("value")
                        elif detail.get("name") == "privateIPv4Address":
                            private_ip = detail.get("value")

            # Extract CPU and memory (in task-level units)
            cpu = task.get("cpu")
            memory = task.get("memory")

            # Detect management source from image tag and tags
            managed_by = self._detect_managed_by(image_tag, tags_dict)

            return {
                "task_id": task_id,
                "task_arn": task_arn,
                "name": self._extract_name_from_tags(tags) or container_name,
                "cluster_name": cluster_name,
                "task_definition_arn": task.get("taskDefinitionArn"),
                "launch_type": task.get("launchType", "UNKNOWN"),
                "status": task.get("lastStatus", "UNKNOWN"),
                "desired_status": task.get("desiredStatus"),
                "cpu": int(cpu) if cpu else 0,
                "memory": int(memory) if memory else 0,
                "container_port": container_port,
                "image": image,
                "image_tag": image_tag,
                "subnet_id": subnet_id,
                "private_ip": private_ip,
                "vpc_id": None,  # Resolved from subnet if needed
                "availability_zone": task.get("availabilityZone"),
                "started_at": task.get("startedAt"),
                "tags": tags_dict,
                "managed_by": managed_by,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in ECS task data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing ECS task: {e}")
            return None

    @staticmethod
    def _detect_managed_by(image_tag: Optional[str], tags: Dict[str, str]) -> str:
        """
        Detect who manages this task based on image tag patterns and resource tags.

        Returns:
            "github_actions" if deployed by CI/CD, "unmanaged" otherwise.
            Terraform management is resolved later during aggregation.
        """
        # Check image tag against CI/CD patterns
        if image_tag:
            for pattern in GITHUB_ACTIONS_PATTERNS:
                if pattern.match(image_tag):
                    return "github_actions"

        # Check resource tags for deployment markers
        if tags.get("deployed-by") == "github-actions":
            return "github_actions"
        if tags.get("managed-by") == "github-actions":
            return "github_actions"

        return "unmanaged"

    async def collect_task(
        self, cluster_name: str, task_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Collect a specific ECS task by cluster and task ID.

        Args:
            cluster_name: The ECS cluster name
            task_id: The ECS task ID

        Returns:
            Task data dictionary, or None if not found
        """
        try:
            ecs = self._get_client("ecs")
            response = ecs.describe_tasks(
                cluster=cluster_name,
                tasks=[task_id],
                include=["TAGS"],
            )

            for task in response.get("tasks", []):
                return self._parse_task(task, cluster_name)

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if error_code == "ClusterNotFoundException":
                logger.warning(f"ECS cluster not found: {cluster_name}")
            else:
                self._handle_client_error(
                    e, f"ECS task lookup: {cluster_name}/{task_id}"
                )
        except Exception as e:
            logger.exception(f"Error collecting ECS task {cluster_name}/{task_id}: {e}")

        return None


async def collect_all_regions() -> List[Dict[str, Any]]:
    """
    Collect ECS containers from all enabled regions.

    Returns:
        Combined list of containers from all regions
    """
    from app.config import get_settings

    settings = get_settings()

    # For now, just collect from the configured region
    collector = ECSCollector(region=settings.aws_region)
    return await collector.collect()
