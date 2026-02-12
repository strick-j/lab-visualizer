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
        """Collect all roles with member details.

        Uses CyberArk Identity Platform API:
        - POST /CDirectoryService/GetRoles (list roles)
        - POST /Roles/GetRoleMembers (per-role members)
        """
        url = f"{self.identity_url}/CDirectoryService/GetRoles"
        logger.info("CyberArk roles: fetching from %s (POST)", url)
        try:
            data = await self._api_post(url)
            logger.info(
                "CyberArk roles: response keys=%s",
                list(data.keys()),
            )
            result_obj = data.get("Result", {})
            if isinstance(result_obj, dict):
                roles_data = result_obj.get("Results", [])
            else:
                roles_data = []
                logger.warning(
                    "CyberArk roles: unexpected Result type: %s",
                    type(result_obj).__name__,
                )
        except Exception:
            logger.exception(
                "Failed to collect CyberArk roles from %s", url
            )
            return []

        results = []
        for role_entry in roles_data:
            row = role_entry.get("Row", role_entry)
            role_id = row.get("ID", row.get("_ID", ""))
            role_name = row.get("Name", "")
            if not role_id:
                logger.debug("Skipping role entry with no ID: %s", row)
                continue
            members = await self._collect_role_members(role_id)
            results.append(
                {
                    "role_id": role_id,
                    "role_name": role_name,
                    "description": row.get("Description"),
                    "members": members,
                }
            )

        logger.info("Collected %d CyberArk roles", len(results))
        return results

    async def _collect_role_members(self, role_id: str) -> List[Dict[str, Any]]:
        """Collect members of a specific role."""
        url = f"{self.identity_url}/Roles/GetRoleMembers"
        try:
            data = await self._api_post(url, json_body={"name": role_id})
            result_obj = data.get("Result", {})
            if isinstance(result_obj, dict):
                members = result_obj.get("Results", [])
            else:
                members = []
            return [
                {
                    "member_name": m.get("Row", m).get("Name", ""),
                    "member_type": m.get("Row", m)
                    .get("Type", "user")
                    .lower(),
                }
                for m in members
            ]
        except Exception:
            logger.warning(
                "Failed to collect members for role %s from %s",
                role_id,
                url,
            )
            return []
