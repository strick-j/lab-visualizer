"""
API routes for CyberArk resources and drift detection.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import get_settings
from app.models.cyberark import (
    CyberArkAccount,
    CyberArkRole,
    CyberArkRoleMember,
    CyberArkSafe,
    CyberArkSafeMember,
    CyberArkSIAPolicy,
    CyberArkSIAPolicyPrincipal,
    CyberArkUser,
)
from app.models.database import get_db
from app.schemas.cyberark import (
    CyberArkAccountBrief,
    CyberArkRoleDetail,
    CyberArkRoleMemberResponse,
    CyberArkRoleResponse,
    CyberArkSafeDetail,
    CyberArkSafeMemberResponse,
    CyberArkSafeResponse,
    CyberArkSIAPolicyDetail,
    CyberArkSIAPolicyPrincipalResponse,
    CyberArkSIAPolicyResponse,
    CyberArkUserResponse,
)
from app.schemas.resources import DriftItem, DriftResponse, ListResponse, MetaInfo

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# =============================================================================
# Safe Endpoints
# =============================================================================


@router.get("/safes", response_model=ListResponse[CyberArkSafeResponse])
async def list_safes(
    search: Optional[str] = Query(None),
    tf_managed: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List CyberArk safes."""
    query = select(CyberArkSafe).where(CyberArkSafe.is_deleted == False)  # noqa: E712
    if search:
        query = query.where(CyberArkSafe.safe_name.icontains(search))
    if tf_managed is not None:
        query = query.where(CyberArkSafe.tf_managed == tf_managed)
    query = query.order_by(CyberArkSafe.safe_name)

    result = await db.execute(query)
    safes = result.scalars().all()
    return ListResponse(
        data=[CyberArkSafeResponse.model_validate(s) for s in safes],
        meta=MetaInfo(total=len(safes)),
    )


@router.get("/safes/{safe_name}", response_model=CyberArkSafeDetail)
async def get_safe(
    safe_name: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Get safe details with members and accounts."""
    result = await db.execute(
        select(CyberArkSafe).where(CyberArkSafe.safe_name == safe_name)
    )
    safe = result.scalar_one_or_none()
    if not safe:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Safe not found")

    # Load members
    members_result = await db.execute(
        select(CyberArkSafeMember).where(
            CyberArkSafeMember.safe_name == safe_name
        )
    )
    members = members_result.scalars().all()

    # Load accounts
    accounts_result = await db.execute(
        select(CyberArkAccount).where(
            CyberArkAccount.safe_name == safe_name,
            CyberArkAccount.is_deleted == False,  # noqa: E712
        )
    )
    accounts = accounts_result.scalars().all()

    safe_dict = {
        **{c.key: getattr(safe, c.key) for c in safe.__table__.columns},
        "members": [
            CyberArkSafeMemberResponse.model_validate(m) for m in members
        ],
        "accounts": [CyberArkAccountBrief.model_validate(a) for a in accounts],
    }
    return CyberArkSafeDetail(**safe_dict)


# =============================================================================
# Role Endpoints
# =============================================================================


@router.get("/roles", response_model=ListResponse[CyberArkRoleResponse])
async def list_roles(
    search: Optional[str] = Query(None),
    tf_managed: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List CyberArk roles."""
    query = select(CyberArkRole).where(CyberArkRole.is_deleted == False)  # noqa: E712
    if search:
        query = query.where(CyberArkRole.role_name.icontains(search))
    if tf_managed is not None:
        query = query.where(CyberArkRole.tf_managed == tf_managed)
    query = query.order_by(CyberArkRole.role_name)

    result = await db.execute(query)
    roles = result.scalars().all()
    return ListResponse(
        data=[CyberArkRoleResponse.model_validate(r) for r in roles],
        meta=MetaInfo(total=len(roles)),
    )


@router.get("/roles/{role_id}", response_model=CyberArkRoleDetail)
async def get_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Get role details with members."""
    result = await db.execute(
        select(CyberArkRole).where(CyberArkRole.role_id == role_id)
    )
    role = result.scalar_one_or_none()
    if not role:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Role not found")

    members_result = await db.execute(
        select(CyberArkRoleMember).where(CyberArkRoleMember.role_id == role_id)
    )
    members = members_result.scalars().all()

    role_dict = {
        **{c.key: getattr(role, c.key) for c in role.__table__.columns},
        "members": [
            CyberArkRoleMemberResponse.model_validate(m) for m in members
        ],
    }
    return CyberArkRoleDetail(**role_dict)


# =============================================================================
# SIA Policy Endpoints
# =============================================================================


@router.get("/sia-policies", response_model=ListResponse[CyberArkSIAPolicyResponse])
async def list_sia_policies(
    search: Optional[str] = Query(None),
    policy_type: Optional[str] = Query(None),
    tf_managed: Optional[bool] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List CyberArk SIA policies."""
    query = select(CyberArkSIAPolicy).where(
        CyberArkSIAPolicy.is_deleted == False  # noqa: E712
    )
    if search:
        query = query.where(CyberArkSIAPolicy.policy_name.icontains(search))
    if policy_type:
        query = query.where(CyberArkSIAPolicy.policy_type == policy_type)
    if tf_managed is not None:
        query = query.where(CyberArkSIAPolicy.tf_managed == tf_managed)
    if status:
        query = query.where(CyberArkSIAPolicy.status == status)
    query = query.order_by(CyberArkSIAPolicy.policy_name)

    result = await db.execute(query)
    policies = result.scalars().all()

    data = []
    for p in policies:
        pdict = {c.key: getattr(p, c.key) for c in p.__table__.columns}
        # Parse target_criteria from JSON string
        if pdict.get("target_criteria") and isinstance(
            pdict["target_criteria"], str
        ):
            try:
                pdict["target_criteria"] = json.loads(pdict["target_criteria"])
            except json.JSONDecodeError:
                pdict["target_criteria"] = None
        data.append(CyberArkSIAPolicyResponse(**pdict))

    return ListResponse(data=data, meta=MetaInfo(total=len(data)))


@router.get(
    "/sia-policies/{policy_id}", response_model=CyberArkSIAPolicyDetail
)
async def get_sia_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Get SIA policy details with principals."""
    result = await db.execute(
        select(CyberArkSIAPolicy).where(
            CyberArkSIAPolicy.policy_id == policy_id
        )
    )
    policy = result.scalar_one_or_none()
    if not policy:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="SIA policy not found")

    principals_result = await db.execute(
        select(CyberArkSIAPolicyPrincipal).where(
            CyberArkSIAPolicyPrincipal.policy_id == policy_id
        )
    )
    principals = principals_result.scalars().all()

    pdict = {c.key: getattr(policy, c.key) for c in policy.__table__.columns}
    if pdict.get("target_criteria") and isinstance(pdict["target_criteria"], str):
        try:
            pdict["target_criteria"] = json.loads(pdict["target_criteria"])
        except json.JSONDecodeError:
            pdict["target_criteria"] = None
    pdict["principals"] = [
        CyberArkSIAPolicyPrincipalResponse.model_validate(pr) for pr in principals
    ]
    return CyberArkSIAPolicyDetail(**pdict)


# =============================================================================
# User Endpoints
# =============================================================================


@router.get("/users", response_model=ListResponse[CyberArkUserResponse])
async def list_users(
    search: Optional[str] = Query(None),
    active: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """List CyberArk Identity users."""
    query = select(CyberArkUser).where(CyberArkUser.is_deleted == False)  # noqa: E712
    if search:
        query = query.where(
            CyberArkUser.user_name.icontains(search)
            | CyberArkUser.display_name.icontains(search)
        )
    if active is not None:
        query = query.where(CyberArkUser.active == active)
    query = query.order_by(CyberArkUser.user_name)

    result = await db.execute(query)
    users = result.scalars().all()
    return ListResponse(
        data=[CyberArkUserResponse.model_validate(u) for u in users],
        meta=MetaInfo(total=len(users)),
    )


# =============================================================================
# CyberArk Drift Detection
# =============================================================================


@router.get("/drift", response_model=DriftResponse)
async def detect_cyberark_drift(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Detect drift between CyberArk API state and Terraform state."""
    from app.parsers.terraform import TerraformStateAggregator

    drift_items = []

    try:
        aggregator = TerraformStateAggregator()
        tf_resources = await aggregator.aggregate_all()
    except Exception:
        logger.exception("Failed to aggregate Terraform resources for CyberArk drift")
        return DriftResponse(
            drift_detected=False,
            items=[],
            checked_at=datetime.now(timezone.utc),
        )

    # Check safes
    safes_result = await db.execute(
        select(CyberArkSafe).where(CyberArkSafe.is_deleted == False)  # noqa: E712
    )
    db_safes = {s.safe_name for s in safes_result.scalars().all()}
    tf_safe_ids = {r.resource_id for r in tf_resources.get("cyberark_safe", [])}

    for safe_name in db_safes - tf_safe_ids:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_safe",
                resource_id=safe_name,
                drift_type="unmanaged",
                details=f"Safe '{safe_name}' exists in CyberArk but not in Terraform",
            )
        )
    for safe_name in tf_safe_ids - db_safes:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_safe",
                resource_id=safe_name,
                drift_type="orphaned",
                details=f"Safe '{safe_name}' in Terraform but not found in CyberArk",
            )
        )

    # Check roles
    roles_result = await db.execute(
        select(CyberArkRole).where(CyberArkRole.is_deleted == False)  # noqa: E712
    )
    db_roles = {r.role_name for r in roles_result.scalars().all()}
    tf_role_ids = {r.resource_id for r in tf_resources.get("cyberark_role", [])}

    for role_name in db_roles - tf_role_ids:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_role",
                resource_id=role_name,
                drift_type="unmanaged",
                details=f"Role '{role_name}' exists in CyberArk but not in Terraform",
            )
        )
    for role_name in tf_role_ids - db_roles:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_role",
                resource_id=role_name,
                drift_type="orphaned",
                details=(
                    f"Role '{role_name}' in Terraform but not found in CyberArk"
                ),
            )
        )

    # Check SIA policies
    policies_result = await db.execute(
        select(CyberArkSIAPolicy).where(
            CyberArkSIAPolicy.is_deleted == False  # noqa: E712
        )
    )
    db_policies = {p.policy_name for p in policies_result.scalars().all()}
    tf_vm_policy_ids = {
        r.resource_id for r in tf_resources.get("cyberark_sia_vm_policy", [])
    }
    tf_db_policy_ids = {
        r.resource_id for r in tf_resources.get("cyberark_sia_db_policy", [])
    }
    tf_policy_ids = tf_vm_policy_ids | tf_db_policy_ids

    for policy_name in db_policies - tf_policy_ids:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_sia_policy",
                resource_id=policy_name,
                drift_type="unmanaged",
                details=(
                    f"SIA policy '{policy_name}' exists in CyberArk "
                    "but not in Terraform"
                ),
            )
        )
    for policy_name in tf_policy_ids - db_policies:
        drift_items.append(
            DriftItem(
                resource_type="cyberark_sia_policy",
                resource_id=policy_name,
                drift_type="orphaned",
                details=(
                    f"SIA policy '{policy_name}' in Terraform "
                    "but not found in CyberArk"
                ),
            )
        )

    return DriftResponse(
        drift_detected=len(drift_items) > 0,
        items=drift_items,
        checked_at=datetime.now(timezone.utc),
    )
