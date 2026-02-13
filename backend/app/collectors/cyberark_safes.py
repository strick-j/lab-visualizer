"""
Collector for CyberArk Privilege Cloud Safes.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)


class CyberArkSafeCollector(CyberArkBaseCollector):
    """Collects safes and their members from CyberArk Privilege Cloud."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all safes with member details."""
        url = f"{self.base_url}/PasswordVault/api/Safes"
        try:
            safes_data = await self._api_get_paginated(
                url, items_key="value", limit=100
            )
        except Exception:
            logger.exception("Failed to collect CyberArk safes")
            return []

        results = []
        for safe in safes_data:
            safe_name = safe.get("safeName", "")
            members = await self._collect_safe_members(safe_name)
            results.append(
                {
                    "safe_name": safe_name,
                    "description": safe.get("description"),
                    "managing_cpm": safe.get("managingCPM"),
                    "number_of_members": len(members),
                    "members": members,
                }
            )

        logger.info("Collected %d CyberArk safes", len(results))
        return results

    async def _collect_safe_members(self, safe_name: str) -> List[Dict[str, Any]]:
        """Collect members of a specific safe."""
        url = f"{self.base_url}/PasswordVault/api/Safes/{safe_name}/Members"
        try:
            data = await self._api_get(url)
            members = data.get("value", [])
            return [
                {
                    "member_name": m.get("memberName", ""),
                    "member_type": m.get("memberType", "user").lower(),
                    "permission_level": self._derive_permission_level(
                        m.get("permissions", {})
                    ),
                }
                for m in members
            ]
        except Exception:
            logger.warning("Failed to collect members for safe %s", safe_name)
            return []

    @staticmethod
    def _derive_permission_level(permissions: Dict[str, bool]) -> str:
        """Derive a permission level label from granular permissions."""
        if permissions.get("manageSafe"):
            return "full"
        if permissions.get("deleteSafe") or permissions.get("updateSafeMembers"):
            return "manager"
        if permissions.get("requestsAuthorizationLevel1"):
            return "approver"
        if permissions.get("useAccounts") or permissions.get("retrieveAccounts"):
            return "use"
        if permissions.get("listAccounts"):
            return "read"
        return "read"
