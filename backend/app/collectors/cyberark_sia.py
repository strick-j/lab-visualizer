"""
Collector for CyberArk SIA (Secure Infrastructure Access) Policies.

SIA policies live on the UAP (Unified Access Portal) service, not Privilege
Cloud.  The UAP base URL is discovered from the platform-discovery API
(``uap.api``) and looks like ``https://<subdomain>.uap.cyberark.cloud/api``.

The list endpoint is ``GET /policies`` (no filter).  Each item in the
``results`` array has a ``metadata`` object and a top-level ``principals``
array.  The ``metadata.policyEntitlement.targetCategory`` field indicates the
policy type (``VM``, ``DB``, ``Cloud Console``, etc.).

Full policy details (including target criteria) can be fetched individually
via ``GET /policies/{policyId}``.

The response format is ``{ "results": [...], "nextToken": "...", "total": N }``.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)

# Map targetCategory values from the API to normalised internal names
_CATEGORY_MAP: Dict[str, str] = {
    "vm": "vm",
    "db": "database",
    "cloud console": "cloud_console",
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
        """Collect all SIA access policies."""
        if not self.uap_base_url:
            logger.warning("SIA: skipping collection — uap_base_url not configured")
            return []

        all_policies = await self._fetch_all_policies()
        all_policies = await self._enrich_with_details(all_policies)
        results = [self._normalise_policy(p) for p in all_policies]
        # Filter out any that failed to parse (returned None)
        results = [r for r in results if r is not None]

        logger.info("Collected %d CyberArk SIA policies", len(results))
        return results

    # ------------------------------------------------------------------
    # Fetch
    # ------------------------------------------------------------------

    async def _fetch_all_policies(self) -> List[Dict[str, Any]]:
        """Fetch all access policies with nextToken pagination."""
        url = f"{self.uap_base_url}/policies"
        all_policies: List[Dict[str, Any]] = []
        params: Dict[str, str] = {}

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
            logger.exception("Failed to collect SIA policies")

        return all_policies

    async def _fetch_policy_detail(self, policy_id: str) -> Optional[Dict[str, Any]]:
        """Fetch full policy detail including targets via GET /policies/{policyId}."""
        url = f"{self.uap_base_url}/policies/{policy_id}"
        try:
            return await self._api_get(url)
        except Exception:
            logger.warning(
                "SIA: failed to fetch detail for policy %s",
                policy_id,
                exc_info=True,
            )
            return None

    async def _enrich_with_details(
        self, policies: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Enrich list-endpoint policies with target data from the detail endpoint.

        Uses bounded concurrency to avoid overwhelming the UAP API.
        """
        semaphore = asyncio.Semaphore(5)

        async def _fetch_one(policy: Dict[str, Any]) -> Dict[str, Any]:
            policy_id = policy.get("metadata", {}).get("policyId", "")
            if not policy_id:
                return policy
            async with semaphore:
                detail = await self._fetch_policy_detail(policy_id)
            if detail:
                policy["targets"] = detail.get("targets", {})
                policy["delegationClassification"] = detail.get(
                    "delegationClassification", ""
                )
            return policy

        enriched = await asyncio.gather(*[_fetch_one(p) for p in policies])
        return list(enriched)

    # ------------------------------------------------------------------
    # Normalise
    # ------------------------------------------------------------------

    def _normalise_policy(self, raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert the UAP API response shape into our internal format.

        The API wraps most fields under ``metadata``.
        """
        metadata = raw.get("metadata", {})
        policy_id = metadata.get("policyId", "")
        if not policy_id:
            logger.debug("Skipping SIA policy with no policyId: %s", raw)
            return None

        # Determine policy type from policyEntitlement.targetCategory
        entitlement = metadata.get("policyEntitlement", {})
        raw_category = (entitlement.get("targetCategory") or "").strip().lower()
        policy_type = _CATEGORY_MAP.get(raw_category, raw_category or "unknown")

        # Status lives under metadata.status.status
        status_obj = metadata.get("status", {})
        status = (
            status_obj.get("status", "Active")
            if isinstance(status_obj, dict)
            else "Active"
        ).lower()

        principals = self._extract_principals(raw.get("principals", []))

        return {
            "policy_id": policy_id,
            "policy_name": metadata.get("name", ""),
            "policy_type": policy_type,
            "description": metadata.get("description"),
            "status": status,
            "target_criteria": self._extract_target_criteria(raw),
            "principals": principals,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_principals(
        principals_list: List[Any],
    ) -> List[Dict[str, Any]]:
        """Extract principal assignments from a policy."""
        principals = []
        for p in principals_list:
            if isinstance(p, dict):
                raw_type = p.get("type", p.get("principalType", "USER")).lower()
                # Normalise: USER -> user, GROUP -> role, ROLE -> role
                if raw_type in ("group", "role"):
                    ptype = "role"
                else:
                    ptype = "user"

                principals.append(
                    {
                        "principal_name": p.get("name", p.get("principalName", "")),
                        "principal_type": ptype,
                    }
                )
            elif isinstance(p, str):
                principals.append({"principal_name": p, "principal_type": "user"})
        return principals

    @staticmethod
    def _extract_target_criteria(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Extract target criteria from the enriched policy dict.

        Converts the API ``targets.AWS`` structure into the internal format
        consumed by :meth:`AccessMappingService._match_sia_criteria_to_targets`.

        API format::

            {"targets": {"AWS": {"vpcIds": [...], "tags": [{"key": ..., "value": [...]}], ...}}}

        Internal format::

            {"vpc_ids": [...], "tags": {"key": [values]}, "match_all": True/False, ...}
        """
        targets = raw.get("targets", {})
        aws_targets = targets.get("AWS", {})

        if not aws_targets:
            return {}

        vpc_ids = aws_targets.get("vpcIds", []) or []
        regions = aws_targets.get("regions", []) or []
        account_ids = aws_targets.get("accountIds", []) or []
        raw_tags = aws_targets.get("tags", []) or []

        # Convert tags from [{key, value: [...]}] to {key: [values]}
        tags: Dict[str, List[str]] = {}
        for tag_entry in raw_tags:
            if not isinstance(tag_entry, dict):
                continue
            key = tag_entry.get("key", "")
            values = tag_entry.get("value", [])
            if key and values:
                tags[key] = values if isinstance(values, list) else [values]

        criteria: Dict[str, Any] = {}

        if vpc_ids:
            criteria["vpc_ids"] = vpc_ids
        if tags:
            criteria["tags"] = tags
        if regions:
            criteria["regions"] = regions
        if account_ids:
            criteria["account_ids"] = account_ids

        # All target arrays empty → policy applies to all targets
        if not criteria:
            criteria["match_all"] = True

        return criteria
