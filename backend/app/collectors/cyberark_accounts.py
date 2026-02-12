"""
Collector for CyberArk Privilege Cloud Accounts.
"""

import logging
from typing import Any, Dict, List

from app.collectors.cyberark_base import CyberArkBaseCollector

logger = logging.getLogger(__name__)


class CyberArkAccountCollector(CyberArkBaseCollector):
    """Collects privileged accounts from CyberArk Privilege Cloud."""

    async def collect(self) -> List[Dict[str, Any]]:
        """Collect all privileged accounts."""
        url = f"{self.base_url}/PasswordVault/api/Accounts"
        try:
            accounts_data = await self._api_get_paginated(
                url, items_key="value", limit=100
            )
        except Exception:
            logger.exception("Failed to collect CyberArk accounts")
            return []

        results = []
        for account in accounts_data:
            results.append(
                {
                    "account_id": account.get("id", ""),
                    "account_name": account.get("name", ""),
                    "safe_name": account.get("safeName", ""),
                    "platform_id": account.get("platformId"),
                    "address": account.get("address"),
                    "username": account.get("userName"),
                    "secret_type": account.get("secretType", "password"),
                }
            )

        logger.info("Collected %d CyberArk accounts", len(results))
        return results
