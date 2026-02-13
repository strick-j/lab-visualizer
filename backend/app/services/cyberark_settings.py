"""
CyberArk settings startup seeding service.

Seeds CyberArkSettings in the database from environment variables on startup,
similar to how ensure_admin_user auto-provisions the admin account.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.cyberark import CyberArkSettings

logger = logging.getLogger(__name__)


async def ensure_cyberark_settings(db: AsyncSession) -> None:
    """
    Seed or sync CyberArk settings from environment variables on startup.

    If no CyberArkSettings row exists and CyberArk env vars are configured,
    creates one seeded from env vars. If a row exists and env vars provide
    secrets, syncs secrets so Secrets Manager values stay current.
    """
    settings = get_settings()

    # Only proceed if at least some CyberArk config is provided
    if not (settings.cyberark_enabled or settings.cyberark_scim_enabled):
        logger.debug("No CyberArk env vars configured; skipping settings seed")
        return

    result = await db.execute(select(CyberArkSettings).limit(1))
    existing = result.scalar_one_or_none()

    if existing:
        # Sync secrets from env vars if provided (Secrets Manager may have
        # rotated values that should override what is in the DB)
        changed = False
        if (
            settings.cyberark_client_secret
            and settings.cyberark_client_secret != existing.client_secret
        ):
            existing.client_secret = settings.cyberark_client_secret
            changed = True
        if (
            settings.cyberark_scim_client_secret
            and settings.cyberark_scim_client_secret != existing.scim_client_secret
        ):
            existing.scim_client_secret = settings.cyberark_scim_client_secret
            changed = True
        if changed:
            await db.commit()
            logger.info("CyberArk settings secrets synced from environment")
        else:
            logger.debug("CyberArk settings already exist; no env sync needed")
        return

    # No row exists — create one seeded from env vars
    new_settings = CyberArkSettings(
        tenant_name=settings.cyberark_tenant_name,
        enabled=settings.cyberark_enabled,
        base_url=settings.cyberark_base_url,
        identity_url=settings.cyberark_identity_url,
        uap_base_url=settings.cyberark_uap_base_url,
        client_id=settings.cyberark_client_id,
        client_secret=settings.cyberark_client_secret,
        scim_enabled=settings.cyberark_scim_enabled,
        scim_app_id=settings.cyberark_scim_app_id,
        scim_scope=settings.cyberark_scim_scope,
        scim_client_id=settings.cyberark_scim_client_id,
        scim_client_secret=settings.cyberark_scim_client_secret,
    )

    # Auto-derive scim_oauth2_url if both identity_url and scim_app_id are set
    if new_settings.identity_url and new_settings.scim_app_id:
        identity_base = new_settings.identity_url.rstrip("/")
        new_settings.scim_oauth2_url = (
            f"{identity_base}/oauth2/token/{new_settings.scim_app_id}"
        )

    db.add(new_settings)
    await db.commit()
    logger.info("CyberArk settings seeded from environment variables")
