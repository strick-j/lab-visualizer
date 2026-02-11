"""
Collector for CyberArk Identity Roles.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)


class CyberArkRoleCollector(CyberArkBaseCollector):
    """Collects roles and members from CyberArk Identity."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all roles with member details."""
        url = f"{self.identity_url}/CDirectoryService/GetRoles"
        try:
            data = await self._api_get(url)
            roles_data = data.get("Result", {}).get("Results", [])
        except Exception:
            logger.exception("Failed to collect CyberArk roles")
            return []

        results = []
        for role_entry in roles_data:
            role = role_entry.get("Row", {})
            role_id = role.get("ID", "")
            role_name = role.get("Name", "")
            members = await self._collect_role_members(role_id)
            results.append(
                {
                    "role_id": role_id,
                    "role_name": role_name,
                    "description": role.get("Description"),
                    "members": members,
                }
            )

        logger.info("Collected %d CyberArk roles", len(results))
        return results

    async def _collect_role_members(self, role_id: str) -> List[Dict[str, Any]]:
        """Collect members of a specific role."""
        url = f"{self.identity_url}/Roles/GetRoleMembers"
        try:
            data = await self._api_get(url, params={"name": role_id})
            members = data.get("Result", {}).get("Results", [])
            return [
                {
                    "member_name": m.get("Row", {}).get("Name", ""),
                    "member_type": m.get("Row", {}).get("Type", "user").lower(),
                }
                for m in members
            ]
        except Exception:
            logger.warning("Failed to collect members for role %s", role_id)
            return []
