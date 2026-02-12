"""
Collector for CyberArk SIA (Secure Infrastructure Access) Policies.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)


class CyberArkSIAPolicyCollector(CyberArkBaseCollector):
    """Collects SIA policies from CyberArk."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all SIA policies (VM and database)."""
        results = []

        # Collect VM access policies
        vm_policies = await self._collect_policies("vm")
        results.extend(vm_policies)

        # Collect database access policies
        db_policies = await self._collect_policies("database")
        results.extend(db_policies)

        logger.info("Collected %d CyberArk SIA policies", len(results))
        return results

    async def _collect_policies(self, policy_type: str) -> List[Dict[str, Any]]:
        """Collect SIA policies of a given type."""
        if policy_type == "vm":
            url = f"{self.base_url}/api/access-policies/vm"
        else:
            url = f"{self.base_url}/api/access-policies/database"

        try:
            data = await self._api_get(url)
            policies = data.get("policies", data.get("value", []))
        except Exception:
            logger.exception("Failed to collect SIA %s policies", policy_type)
            return []

        results = []
        for policy in policies:
            policy_id = policy.get("id", policy.get("policyId", ""))
            principals = self._extract_principals(policy)
            target_criteria = self._extract_target_criteria(policy, policy_type)

            results.append(
                {
                    "policy_id": policy_id,
                    "policy_name": policy.get("name", policy.get("policyName", "")),
                    "policy_type": policy_type,
                    "description": policy.get("description"),
                    "status": policy.get("status", "active"),
                    "target_criteria": target_criteria,
                    "principals": principals,
                }
            )

        return results

    @staticmethod
    def _extract_principals(policy: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract principal assignments from a policy."""
        principals = []
        for p in policy.get("principals", policy.get("userAccessRules", [])):
            if isinstance(p, dict):
                principals.append(
                    {
                        "principal_name": p.get("name", p.get("principalName", "")),
                        "principal_type": p.get("type", p.get("principalType", "user"))
                        .lower()
                        .replace("group", "role"),
                    }
                )
            elif isinstance(p, str):
                principals.append(
                    {"principal_name": p, "principal_type": "user"}
                )
        return principals

    @staticmethod
    def _extract_target_criteria(
        policy: Dict[str, Any], policy_type: str
    ) -> Dict[str, Any]:
        """Extract target matching criteria from a policy."""
        criteria: Dict[str, Any] = {}

        # AWS-specific attributes
        locations = policy.get("locations", policy.get("targetScope", {}))
        if isinstance(locations, dict):
            if locations.get("vpcIds"):
                criteria["vpc_ids"] = locations["vpcIds"]
            if locations.get("subnetIds"):
                criteria["subnet_ids"] = locations["subnetIds"]
            if locations.get("tags"):
                criteria["tags"] = locations["tags"]
            if locations.get("regions"):
                criteria["regions"] = locations["regions"]
            if locations.get("accountIds"):
                criteria["account_ids"] = locations["accountIds"]

        # FQDN/IP patterns
        if policy.get("fqdnPatterns"):
            criteria["fqdn_patterns"] = policy["fqdnPatterns"]
        if policy.get("ipRanges"):
            criteria["ip_ranges"] = policy["ipRanges"]

        # For VM policies, check connection rules
        connection = policy.get("connectionBehavior", {})
        if connection.get("protocols"):
            criteria["protocols"] = connection["protocols"]

        return criteria
