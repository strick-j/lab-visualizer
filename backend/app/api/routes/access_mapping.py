"""
API routes for access mapping visualization.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.models.database import get_db
from app.schemas.cyberark import (
    AccessMappingResponse,
    AccessMappingTargetBrief,
    AccessMappingTargetList,
    AccessMappingUserList,
)
from app.services.access_mapping import AccessMappingService

logger = logging.getLogger(__name__)
router = APIRouter()


async def _resolve_cyberark_user(
    service: AccessMappingService, current_user
) -> Optional[str]:
    """Match the authenticated user to a CyberArk user name.

    Tries case-insensitive matching of the user's email and username
    against known CyberArk user names.
    """
    all_users = await service._get_all_users()
    lower_map = {u.lower(): u for u in all_users}

    if current_user.email:
        match = lower_map.get(current_user.email.lower())
        if match:
            return match

    if current_user.username:
        match = lower_map.get(current_user.username.lower())
        if match:
            return match

    return None


@router.get("/access-mapping", response_model=AccessMappingResponse)
async def get_access_mapping(
    user: Optional[str] = Query(None, description="Filter by user name"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get access mapping data for visualization."""
    service = AccessMappingService(db)

    # Non-admin users can only see their own access
    if not current_user.is_admin:
        resolved = await _resolve_cyberark_user(service, current_user)
        if not resolved:
            return AccessMappingResponse(
                users=[],
                total_users=0,
                total_targets=0,
                total_standing_paths=0,
                total_jit_paths=0,
            )
        user = resolved

    if user:
        user_mapping = await service.compute_user_access(user)
        standing = sum(
            1
            for t in user_mapping.targets
            for p in t.access_paths
            if p.access_type == "standing"
        )
        jit = sum(
            1
            for t in user_mapping.targets
            for p in t.access_paths
            if p.access_type == "jit"
        )
        has_data = bool(user_mapping.targets or user_mapping.access_paths)
        return AccessMappingResponse(
            users=[user_mapping] if has_data else [],
            total_users=1 if has_data else 0,
            total_targets=len(user_mapping.targets),
            total_standing_paths=standing,
            total_jit_paths=jit,
        )

    return await service.compute_all_mappings()


@router.get("/access-mapping/users", response_model=AccessMappingUserList)
async def list_access_users(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all unique users from CyberArk memberships."""
    service = AccessMappingService(db)

    if current_user.is_admin:
        users = await service._get_all_users()
        return AccessMappingUserList(users=users)

    # Non-admin: return only their own CyberArk identity
    resolved = await _resolve_cyberark_user(service, current_user)
    return AccessMappingUserList(users=[resolved] if resolved else [])


@router.get("/access-mapping/targets", response_model=AccessMappingTargetList)
async def list_access_targets(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List all EC2/RDS targets available for access mapping."""
    from sqlalchemy import select

    from app.models.resources import EC2Instance, RDSInstance

    targets = []

    ec2_result = await db.execute(
        select(EC2Instance).where(EC2Instance.is_deleted == False)  # noqa: E712
    )
    for ec2 in ec2_result.scalars().all():
        targets.append(
            AccessMappingTargetBrief(
                target_type="ec2",
                target_id=ec2.instance_id,
                target_name=ec2.name,
                target_address=ec2.private_ip,
            )
        )

    rds_result = await db.execute(
        select(RDSInstance).where(RDSInstance.is_deleted == False)  # noqa: E712
    )
    for rds in rds_result.scalars().all():
        targets.append(
            AccessMappingTargetBrief(
                target_type="rds",
                target_id=rds.db_instance_identifier,
                target_name=rds.name,
                target_address=rds.endpoint,
            )
        )

    return AccessMappingTargetList(targets=targets)
