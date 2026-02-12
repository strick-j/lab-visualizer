"""
Collector for CyberArk SIA (Secure Infrastructure Access) Policies.

SIA policies live on the UAP (Unified Access Portal) service, not Privilege
Cloud.  The UAP base URL is discovered from the platform-discovery API
(``uap.api``) and looks like ``https://<subdomain>.uap.cyberark.cloud/api``.

The endpoint is ``/access-policies`` with a ``filter`` query parameter to
select by target category, e.g. ``filter=(targetCategory eq 'VM')``.

The response format is ``{ "results": [...], "nextToken": "...", "total": N }``.
"""

import logging
from typing import Any, Dict, List, Optional

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)

# Map internal policy type names to UAP targetCategory filter values
_CATEGORY_FILTERS: Dict[str, str] = {
    "vm": "(targetCategory eq 'VM')",
    "database": "(targetCategory eq 'Database')",
}


class CyberArkSIAPolicyCollector(CyberArkBaseCollector):
    """Collects SIA policies from CyberArk UAP service."""

    def __init__(
        self,
        uap_base_url: Optional[str] = None,
        **kwargs: Any,
    ):
        super().__init__(**kwargs)
        self.uap_base_url = (uap_base_url or "").rstrip("/")

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all SIA policies (VM and database)."""
        if not self.uap_base_url:
            logger.warning("SIA: skipping collection — uap_base_url not configured")
            return []

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
        """Collect SIA policies of a given type with nextToken pagination.

        Uses the single ``/access-policies`` endpoint with a ``filter``
        query parameter to select by target category.
        """
        url = f"{self.uap_base_url}/access-policies"
        category_filter = _CATEGORY_FILTERS.get(policy_type, "")

        all_policies: List[Dict[str, Any]] = []
        params: Dict[str, str] = {}
        if category_filter:
            params["filter"] = category_filter

        try:
            while True:
                data = await self._api_get(url, params=params if params else None)
                policies = data.get("results", [])
                all_policies.extend(policies)

                next_token = data.get("nextToken")
                if not next_token or len(policies) == 0:
                    break
                params["nextToken"] = next_token
        except Exception:
            logger.exception("Failed to collect SIA %s policies", policy_type)
            return []

        results = []
        for policy in all_policies:
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
                principals.append({"principal_name": p, "principal_type": "user"})
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
