"""
Base collector for CyberArk SCIM API resources.

Uses a separate OAuth2 client_credentials flow distinct from the
platform token used by Privilege Cloud collectors.
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class CyberArkScimBaseCollector(ABC):
    """Abstract base class for CyberArk SCIM API collectors."""

    def __init__(
        self,
        identity_url: str,
        scim_oauth2_url: str,
        scim_scope: str,
        scim_client_id: str,
        scim_client_secret: str,
    ):
        self.identity_url = identity_url.rstrip("/")
        self.scim_oauth2_url = scim_oauth2_url.rstrip("/")
        self.scim_scope = scim_scope
        self.scim_client_id = scim_client_id
        self.scim_client_secret = scim_client_secret
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _authenticate(self) -> str:
        """Obtain OAuth2 token for SCIM API access."""
        if (
            self._token
            and self._token_expiry
            and datetime.now(timezone.utc) < self._token_expiry
        ):
            return self._token

        logger.info("SCIM auth: requesting token from %s", self.scim_oauth2_url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.scim_oauth2_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.scim_client_id,
                    "client_secret": self.scim_client_secret,
                    "scope": self.scim_scope,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if response.status_code != 200:
                logger.error(
                    "SCIM auth failed: HTTP %s — %s",
                    response.status_code,
                    response.text[:500],
                )
            response.raise_for_status()
            data = response.json()

        token_type = data.get("token_type", "")
        scope = data.get("scope", "")
        self._token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expiry = datetime.now(timezone.utc) + timedelta(
            seconds=expires_in - 60
        )
        logger.info(
            "SCIM auth: token acquired (token_type=%s, scope=%s, "
            "expires_in=%ds, token_prefix=%s...)",
            token_type,
            scope or "(empty)",
            expires_in,
            self._token[:20] if self._token else "None",
        )
        return self._token

    async def _get_headers(self) -> Dict[str, str]:
        """Get authenticated request headers."""
        token = await self._authenticate()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def _scim_get(
        self, url: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated GET request to SCIM API."""
        headers = await self._get_headers()
        logger.debug("SCIM API GET %s", url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code != 200:
                logger.error(
                    "SCIM API GET %s returned HTTP %s — body=%s",
                    url,
                    response.status_code,
                    response.text[:500],
                )
            response.raise_for_status()
            result: Dict[str, Any] = response.json()
            return result

    async def _scim_get_paginated(
        self,
        url: str,
        count: int = 100,
    ) -> List[Dict[str, Any]]:
        """Paginate through SCIM list responses using startIndex."""
        all_items: List[Dict[str, Any]] = []
        start_index = 1

        while True:
            data = await self._scim_get(
                url, params={"startIndex": start_index, "count": count}
            )
            resources = data.get("Resources", [])
            all_items.extend(resources)

            total_results = data.get("totalResults", 0)
            if start_index + count > total_results or len(resources) == 0:
                break
            start_index += count

        return all_items

    @abstractmethod
    async def collect(self) -> List[Dict[str, Any]]:
        """Collect resources from SCIM API."""
        pass
