"""
Collector for CyberArk Identity Users via SCIM /scim/v2/users.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_scim import CyberArkScimBaseCollector

logger = logging.getLogger(__name__)


class CyberArkUserCollector(CyberArkScimBaseCollector):
    """Collects users from CyberArk Identity SCIM API."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all users via SCIM users endpoint."""
        url = f"{self.identity_url}/scim/v2/users"
        logger.info("CyberArk users: fetching from %s (SCIM)", url)

        try:
            users = await self._scim_get_paginated(url)
            logger.info(
                "CyberArk users: SCIM returned %d users", len(users)
            )
        except Exception:
            logger.exception(
                "Failed to collect CyberArk users from %s", url
            )
            return []

        results = []
        for user in users:
            user_id = user.get("id", "")
            if not user_id:
                logger.debug("Skipping SCIM user with no id: %s", user)
                continue

            # Extract email from emails array
            email = None
            emails = user.get("emails", [])
            if emails and isinstance(emails, list):
                for e in emails:
                    if isinstance(e, dict):
                        if e.get("primary", False):
                            email = e.get("value")
                            break
                        if not email:
                            email = e.get("value")
                    elif isinstance(e, str):
                        email = e
                        break

            results.append(
                {
                    "user_id": user_id,
                    "user_name": user.get("userName", ""),
                    "display_name": user.get("displayName", ""),
                    "email": email,
                    "active": user.get("active", True),
                }
            )

        logger.info("Collected %d CyberArk users (SCIM)", len(results))
        return results
