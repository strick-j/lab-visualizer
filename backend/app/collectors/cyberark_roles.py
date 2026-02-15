"""
Collector for CyberArk Identity Roles via SCIM /scim/v2/groups.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_scim import CyberArkScimBaseCollector

logger = logging.getLogger(__name__)


class CyberArkRoleCollector(CyberArkScimBaseCollector):
    """Collects roles (groups) and members from CyberArk Identity SCIM API."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all roles with member details via SCIM groups endpoint."""
        url = f"{self.identity_url}/scim/v2/groups"
        logger.info("CyberArk roles: fetching from %s (SCIM)", url)

        try:
            groups = await self._scim_get_paginated(url)
            logger.info("CyberArk roles: SCIM returned %d groups", len(groups))
        except Exception:
            logger.exception("Failed to collect CyberArk roles from %s", url)
            return []

        results = []
        for group in groups:
            group_id = group.get("id", "")
            display_name = group.get("displayName", "")
            if not group_id:
                logger.debug("Skipping SCIM group with no id: %s", group)
                continue

            members = []
            for member in group.get("members", []):
                member_ref = member.get("$ref", "")
                member_type = "user"
                if "/groups/" in member_ref.lower():
                    member_type = "group"

                members.append(
                    {
                        "member_name": member.get("display", member.get("value", "")),
                        "member_type": member_type,
                    }
                )

            results.append(
                {
                    "role_id": group_id,
                    "role_name": display_name,
                    "description": None,
                    "members": members,
                }
            )

        logger.info("Collected %d CyberArk roles (SCIM groups)", len(results))
        return results
