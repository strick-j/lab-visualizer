"""
Settings service for managing authentication configuration.

Handles reading and writing auth settings to the database,
with fallback to environment variables.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.auth import AuthSettings

logger = logging.getLogger(__name__)
env_settings = get_settings()


async def get_auth_settings(db: AsyncSession) -> Optional[AuthSettings]:
    """Get the current auth settings from the database."""
    try:
        result = await db.execute(select(AuthSettings).limit(1))
        settings: Optional[AuthSettings] = result.scalar_one_or_none()
        return settings
    except Exception as e:
        # Table might not exist yet, return None to fall back to env vars
        logger.debug(f"Could not query auth_settings table: {e}")
        return None


async def get_or_create_auth_settings(db: AsyncSession) -> AuthSettings:
    """Get existing auth settings or create default settings."""
    settings = await get_auth_settings(db)
    if settings:
        return settings

    # Create default settings from environment variables
    settings = AuthSettings(
        oidc_enabled=env_settings.oidc_enabled,
        oidc_issuer=env_settings.oidc_issuer,
        oidc_client_id=env_settings.oidc_client_id,
        oidc_client_secret=env_settings.oidc_client_secret,
        access_token_expire_minutes=env_settings.access_token_expire_minutes,
        refresh_token_expire_days=env_settings.refresh_token_expire_days,
    )
    db.add(settings)
    await db.commit()
    await db.refresh(settings)
    logger.info("Created default auth settings from environment variables")
    return settings


async def update_oidc_settings(
    db: AsyncSession,
    enabled: bool,
    issuer: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    display_name: Optional[str] = None,
    access_token_expire_minutes: Optional[int] = None,
    refresh_token_expire_days: Optional[int] = None,
    updated_by: Optional[str] = None,
    role_claim: Optional[str] = None,
    admin_groups: Optional[str] = None,
    user_groups: Optional[str] = None,
    viewer_groups: Optional[str] = None,
    default_role: Optional[str] = None,
) -> AuthSettings:
    """Update OIDC settings."""
    settings = await get_or_create_auth_settings(db)

    settings.oidc_enabled = enabled
    if issuer is not None:
        settings.oidc_issuer = issuer
    if client_id is not None:
        settings.oidc_client_id = client_id
    if client_secret is not None:
        settings.oidc_client_secret = client_secret
    if display_name is not None:
        settings.oidc_display_name = display_name
    if access_token_expire_minutes is not None:
        settings.access_token_expire_minutes = access_token_expire_minutes
    if refresh_token_expire_days is not None:
        settings.refresh_token_expire_days = refresh_token_expire_days
    if role_claim is not None:
        settings.oidc_role_claim = role_claim
    if admin_groups is not None:
        settings.oidc_admin_groups = admin_groups
    if user_groups is not None:
        settings.oidc_user_groups = user_groups
    if viewer_groups is not None:
        settings.oidc_viewer_groups = viewer_groups
    if default_role is not None:
        settings.oidc_default_role = default_role
    if updated_by:
        settings.updated_by = updated_by

    await db.commit()
    await db.refresh(settings)
    logger.info(f"Updated OIDC settings (enabled={enabled}) by {updated_by}")
    return settings


async def get_effective_oidc_config(db: AsyncSession) -> dict:
    """
    Get effective OIDC configuration.

    Database settings take precedence over environment variables.
    """
    db_settings = await get_auth_settings(db)

    if db_settings and (db_settings.oidc_issuer or db_settings.oidc_client_id):
        # Use database settings
        return {
            "enabled": db_settings.oidc_enabled,
            "issuer": db_settings.oidc_issuer,
            "client_id": db_settings.oidc_client_id,
            "client_secret": db_settings.oidc_client_secret,
            "display_name": db_settings.oidc_display_name or "OIDC",
            "access_token_expire_minutes": (
                db_settings.access_token_expire_minutes
                or env_settings.access_token_expire_minutes
            ),
            "refresh_token_expire_days": (
                db_settings.refresh_token_expire_days
                or env_settings.refresh_token_expire_days
            ),
            "role_claim": db_settings.oidc_role_claim or "groups",
            "admin_groups": db_settings.oidc_admin_groups or "",
            "user_groups": db_settings.oidc_user_groups or "",
            "viewer_groups": db_settings.oidc_viewer_groups or "",
            "default_role": db_settings.oidc_default_role or "viewer",
        }

    # Fall back to environment variables
    return {
        "enabled": env_settings.oidc_enabled,
        "issuer": env_settings.oidc_issuer,
        "client_id": env_settings.oidc_client_id,
        "client_secret": env_settings.oidc_client_secret,
        "display_name": "OIDC",
        "access_token_expire_minutes": env_settings.access_token_expire_minutes,
        "refresh_token_expire_days": env_settings.refresh_token_expire_days,
        "role_claim": "groups",
        "admin_groups": "",
        "user_groups": "",
        "viewer_groups": "",
        "default_role": "viewer",
    }


async def get_token_expiration_settings(db: AsyncSession) -> dict:
    """
    Get effective token expiration settings.

    Database settings take precedence over environment variables.
    """
    db_settings = await get_auth_settings(db)

    if db_settings:
        return {
            "access_token_expire_minutes": (
                db_settings.access_token_expire_minutes
                or env_settings.access_token_expire_minutes
            ),
            "refresh_token_expire_days": (
                db_settings.refresh_token_expire_days
                or env_settings.refresh_token_expire_days
            ),
        }

    return {
        "access_token_expire_minutes": env_settings.access_token_expire_minutes,
        "refresh_token_expire_days": env_settings.refresh_token_expire_days,
    }


def mask_secret(secret: Optional[str]) -> Optional[str]:
    """Mask a secret value for display, showing only first/last 4 chars."""
    if not secret:
        return None
    if len(secret) <= 8:
        return "*" * len(secret)
    return f"{secret[:4]}{'*' * (len(secret) - 8)}{secret[-4:]}"
