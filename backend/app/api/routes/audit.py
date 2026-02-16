"""
Audit log endpoints.

Provides admin-only access to the persistent audit trail.
"""

import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user
from app.models.auth import AuditLog
from app.models.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter()


class AuditLogEntry(BaseModel):
    """Response schema for a single audit log entry."""

    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    """Paginated audit log response."""

    data: List[AuditLogEntry]
    total: int
    page: int
    page_size: int
    has_more: bool


@router.get(
    "/audit-logs",
    response_model=AuditLogResponse,
    dependencies=[Depends(get_current_admin_user)],
)
async def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    username: Optional[str] = Query(None, description="Filter by username"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    db: AsyncSession = Depends(get_db),
):
    """List audit log entries with filtering and pagination. Admin only."""
    conditions = []

    if action:
        conditions.append(AuditLog.action == action)
    if username:
        conditions.append(AuditLog.username.ilike(f"%{username}%"))
    if start_date:
        conditions.append(AuditLog.timestamp >= start_date)
    if end_date:
        conditions.append(AuditLog.timestamp <= end_date)

    # Count
    count_query = select(func.count(AuditLog.id))
    if conditions:
        count_query = count_query.where(*conditions)
    total = (await db.execute(count_query)).scalar_one()

    # Data
    query = select(AuditLog)
    if conditions:
        query = query.where(*conditions)
    query = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    result = await db.execute(query)
    entries = result.scalars().all()

    data = []
    for entry in entries:
        details = None
        if entry.details:
            try:
                details = json.loads(entry.details)
            except json.JSONDecodeError:
                details = {"raw": entry.details}
        data.append(
            AuditLogEntry(
                id=entry.id,
                timestamp=entry.timestamp,
                user_id=entry.user_id,
                username=entry.username,
                action=entry.action,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id,
                details=details,
                ip_address=entry.ip_address,
            )
        )

    return AuditLogResponse(
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        has_more=(page * page_size) < total,
    )
