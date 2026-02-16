"""
Audit logging service.

Provides persistent audit trail for security-relevant actions.
"""

import json
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.auth import AuditLog, User

logger = logging.getLogger(__name__)


async def audit_log(
    db: AsyncSession,
    action: str,
    user: Optional[User] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Create an audit log entry.

    Args:
        db: Database session
        action: Action performed (login, logout, refresh, settings_change, etc.)
        user: User who performed the action
        resource_type: Type of resource affected (user, settings, data, etc.)
        resource_id: ID of the affected resource
        details: Additional details as a dict (stored as JSON)
        ip_address: Client IP address
        user_agent: Client user agent string
    """
    entry = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if details else None,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    await db.flush()
    logger.info(
        "Audit: action=%s user=%s resource=%s/%s",
        action,
        user.username if user else "anonymous",
        resource_type or "-",
        resource_id or "-",
    )
