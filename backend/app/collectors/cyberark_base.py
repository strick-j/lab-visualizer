"""
Base collector class for CyberArk API resources.

Provides common REST/OAuth2 functionality for all CyberArk data collectors.
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CyberArkBaseCollector(ABC):
    """Abstract base class for CyberArk REST API collectors."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        identity_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.cyberark_base_url or "").rstrip("/")
        self.identity_url = (
            identity_url or settings.cyberark_identity_url or ""
        ).rstrip("/")
        self.client_id = client_id or settings.cyberark_client_id
        self.client_secret = client_secret or settings.cyberark_client_secret
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None

    async def _authenticate(self) -> str:
        """Obtain OAuth2 token from CyberArk Identity."""
        if (
            self._token
            and self._token_expiry
            and datetime.now(timezone.utc) < self._token_expiry
        ):
            return self._token

        token_url = f"{self.identity_url}/oauth2/platformtoken"
        logger.info("CyberArk auth: requesting token from %s", token_url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if response.status_code != 200:
                logger.error(
                    "CyberArk auth failed: HTTP %s — %s",
                    response.status_code,
                    response.text[:500],
                )
            response.raise_for_status()
            data = response.json()

        self._token = data["access_token"]
        expires_in = data.get("expires_in", 3600)
        self._token_expiry = datetime.now(timezone.utc) + timedelta(
            seconds=expires_in - 60
        )
        logger.info("CyberArk auth: token acquired (expires_in=%ds)", expires_in)
        return self._token

    async def _get_headers(self) -> Dict[str, str]:
        """Get authenticated request headers."""
        token = await self._authenticate()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def _api_get(
        self, url: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated GET request to CyberArk API."""
        headers = await self._get_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            if response.status_code != 200:
                logger.error(
                    "CyberArk API GET %s returned HTTP %s — %s",
                    url,
                    response.status_code,
                    response.text[:500],
                )
            response.raise_for_status()
            result: Dict[str, Any] = response.json()
            return result

    async def _api_get_paginated(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None,
        items_key: str = "value",
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Make paginated GET requests to CyberArk API."""
        all_items: List[Dict[str, Any]] = []
        offset = 0
        params = dict(params or {})

        while True:
            params["limit"] = limit
            params["offset"] = offset
            data = await self._api_get(url, params)
            items = data.get(items_key, [])
            all_items.extend(items)

            if len(items) < limit:
                break
            offset += limit

        return all_items

    @abstractmethod
    async def collect(self) -> List[Dict[str, Any]]:
        """Collect resources from CyberArk API."""
        pass
