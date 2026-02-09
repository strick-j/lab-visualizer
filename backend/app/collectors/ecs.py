"""
ECS Cluster and Service collector.

Collects ECS cluster and service data from AWS using the boto3 SDK.
"""

import logging
from typing import Any, Dict, List, Optional

from botocore.exceptions import ClientError

from app.collectors.base import BaseCollector

logger = logging.getLogger(__name__)


class ECSCollector(BaseCollector):
    """Collector for ECS clusters and services."""

    async def collect(self) -> List[Dict[str, Any]]:
        """
        Collect all ECS clusters and their services from the configured region.

        Returns:
            List of ECS cluster data dictionaries with nested services
        """
        logger.info(f"Collecting ECS clusters from region: {self.region}")
        clusters = []

        try:
            ecs = self._get_client("ecs")

            # List all cluster ARNs
            cluster_arns = []
            paginator = ecs.get_paginator("list_clusters")
            for page in paginator.paginate():
                cluster_arns.extend(page.get("clusterArns", []))

            if not cluster_arns:
                logger.info(f"No ECS clusters found in {self.region}")
                return clusters

            # Describe clusters in batches (API supports up to 100)
            for i in range(0, len(cluster_arns), 100):
                batch = cluster_arns[i : i + 100]
                response = ecs.describe_clusters(
                    clusters=batch,
                    include=["TAGS", "SETTINGS", "STATISTICS"],
                )

                for cluster in response.get("clusters", []):
                    cluster_data = self._parse_cluster(cluster)
                    if cluster_data:
                        # Collect services for this cluster
                        services = await self._collect_services(
                            ecs, cluster["clusterArn"]
                        )
                        cluster_data["services"] = services
                        clusters.append(cluster_data)

            logger.info(
                f"Collected {len(clusters)} ECS clusters from {self.region}"
            )

        except ClientError as e:
            self._handle_client_error(e, f"ECS collection in {self.region}")
        except Exception as e:
            logger.exception(f"Unexpected error collecting ECS clusters: {e}")

        return clusters

    def _parse_cluster(self, cluster: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an ECS cluster response into a normalized dictionary.

        Args:
            cluster: Raw ECS cluster data from boto3

        Returns:
            Normalized cluster dictionary, or None if parsing fails
        """
        try:
            tags = cluster.get("tags", [])
            tags_dict = {tag["key"]: tag.get("value", "") for tag in tags}

            # Extract name from tags or cluster name
            name = tags_dict.get("Name", cluster.get("clusterName"))

            return {
                "cluster_arn": cluster["clusterArn"],
                "cluster_name": cluster.get("clusterName", "unknown"),
                "name": name,
                "status": cluster.get("status", "unknown"),
                "registered_container_instances_count": cluster.get(
                    "registeredContainerInstancesCount", 0
                ),
                "running_tasks_count": cluster.get("runningTasksCount", 0),
                "pending_tasks_count": cluster.get("pendingTasksCount", 0),
                "active_services_count": cluster.get("activeServicesCount", 0),
                "tags": tags_dict,
                "region": self.region,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in ECS cluster data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing ECS cluster: {e}")
            return None

    async def _collect_services(
        self, ecs: Any, cluster_arn: str
    ) -> List[Dict[str, Any]]:
        """
        Collect all services for a given ECS cluster.

        Args:
            ecs: boto3 ECS client
            cluster_arn: ARN of the cluster

        Returns:
            List of service data dictionaries
        """
        services = []

        try:
            # List service ARNs
            service_arns = []
            paginator = ecs.get_paginator("list_services")
            for page in paginator.paginate(cluster=cluster_arn):
                service_arns.extend(page.get("serviceArns", []))

            if not service_arns:
                return services

            # Describe services in batches (API supports up to 10)
            for i in range(0, len(service_arns), 10):
                batch = service_arns[i : i + 10]
                response = ecs.describe_services(
                    cluster=cluster_arn,
                    services=batch,
                    include=["TAGS"],
                )

                for service in response.get("services", []):
                    service_data = self._parse_service(service)
                    if service_data:
                        services.append(service_data)

        except ClientError as e:
            self._handle_client_error(
                e, f"ECS service collection for cluster {cluster_arn}"
            )
        except Exception as e:
            logger.warning(f"Error collecting services for cluster {cluster_arn}: {e}")

        return services

    def _parse_service(self, service: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse an ECS service response into a normalized dictionary.

        Args:
            service: Raw ECS service data from boto3

        Returns:
            Normalized service dictionary, or None if parsing fails
        """
        try:
            tags = service.get("tags", [])
            tags_dict = {tag["key"]: tag.get("value", "") for tag in tags}

            # Extract network info from network configuration
            subnet_ids = []
            security_groups = []
            network_config = service.get("networkConfiguration", {})
            awsvpc_config = network_config.get("awsvpcConfiguration", {})
            if awsvpc_config:
                subnet_ids = awsvpc_config.get("subnets", [])
                security_groups = awsvpc_config.get("securityGroups", [])

            return {
                "service_arn": service["serviceArn"],
                "service_name": service.get("serviceName", "unknown"),
                "cluster_arn": service.get("clusterArn", ""),
                "status": service.get("status", "unknown"),
                "desired_count": service.get("desiredCount", 0),
                "running_count": service.get("runningCount", 0),
                "pending_count": service.get("pendingCount", 0),
                "launch_type": service.get("launchType", ""),
                "task_definition": service.get("taskDefinition", ""),
                "subnet_ids": subnet_ids,
                "security_groups": security_groups,
                "tags": tags_dict,
            }

        except KeyError as e:
            logger.warning(f"Missing required field in ECS service data: {e}")
            return None
        except Exception as e:
            logger.warning(f"Error parsing ECS service: {e}")
            return None
