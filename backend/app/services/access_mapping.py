"""
Access Mapping Service.

Computes access paths between CyberArk users and AWS targets (EC2/RDS).
"""

import ipaddress
import json
import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cyberark import (
    CyberArkAccount,
    CyberArkRoleMember,
    CyberArkSafeMember,
    CyberArkSIAPolicy,
    CyberArkSIAPolicyPrincipal,
)
from app.models.resources import EC2Instance, RDSInstance
from app.schemas.cyberark import (
    AccessMappingResponse,
    AccessPath,
    AccessPathStep,
    TargetAccessInfo,
    UserAccessMapping,
)

logger = logging.getLogger(__name__)


class AccessMappingService:
    """Computes access paths between CyberArk users and AWS targets."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self._ec2_cache: Optional[List[EC2Instance]] = None
        self._rds_cache: Optional[List[RDSInstance]] = None

    async def compute_all_mappings(self) -> AccessMappingResponse:
        """Compute the full access mapping graph."""
        all_users = await self._get_all_users()
        all_user_mappings: List[UserAccessMapping] = []
        total_standing = 0
        total_jit = 0
        target_ids: Set[str] = set()

        for user_name in all_users:
            mapping = await self.compute_user_access(user_name)
            if mapping.targets:
                all_user_mappings.append(mapping)
                for t in mapping.targets:
                    target_ids.add(f"{t.target_type}:{t.target_id}")
                    for path in t.access_paths:
                        if path.access_type == "standing":
                            total_standing += 1
                        else:
                            total_jit += 1

        return AccessMappingResponse(
            users=all_user_mappings,
            total_users=len(all_user_mappings),
            total_targets=len(target_ids),
            total_standing_paths=total_standing,
            total_jit_paths=total_jit,
        )

    async def compute_user_access(self, user_name: str) -> UserAccessMapping:
        """Compute all targets a specific user can access."""
        standing = await self._compute_standing_access(user_name)
        jit = await self._compute_jit_access(user_name)

        # Merge targets by target_id, combining access paths
        target_map: Dict[str, TargetAccessInfo] = {}
        for t in standing + jit:
            key = f"{t.target_type}:{t.target_id}"
            if key in target_map:
                target_map[key].access_paths.extend(t.access_paths)
            else:
                target_map[key] = t

        return UserAccessMapping(
            user_name=user_name, targets=list(target_map.values())
        )

    async def _get_all_users(self) -> List[str]:
        """Get all unique user names from role memberships and safe memberships."""
        users: Set[str] = set()

        # Users from role memberships
        result = await self.db.execute(
            select(CyberArkRoleMember.member_name).where(
                CyberArkRoleMember.member_type == "user"
            )
        )
        users.update(row[0] for row in result.all())

        # Users from safe memberships
        result = await self.db.execute(
            select(CyberArkSafeMember.member_name).where(
                CyberArkSafeMember.member_type == "user"
            )
        )
        users.update(row[0] for row in result.all())

        # Users from SIA policy principals
        result = await self.db.execute(
            select(CyberArkSIAPolicyPrincipal.principal_name).where(
                CyberArkSIAPolicyPrincipal.principal_type == "user"
            )
        )
        users.update(row[0] for row in result.all())

        return sorted(users)

    async def _get_user_roles(self, user_name: str) -> List[str]:
        """Get all role IDs the user is a member of."""
        result = await self.db.execute(
            select(CyberArkRoleMember.role_id).where(
                CyberArkRoleMember.member_name == user_name,
                CyberArkRoleMember.member_type == "user",
            )
        )
        return [row[0] for row in result.all()]

    async def _get_ec2_instances(self) -> List[EC2Instance]:
        """Get cached EC2 instances."""
        if self._ec2_cache is None:
            result = await self.db.execute(
                select(EC2Instance).where(
                    EC2Instance.is_deleted == False  # noqa: E712
                )
            )
            self._ec2_cache = list(result.scalars().all())
        return self._ec2_cache

    async def _get_rds_instances(self) -> List[RDSInstance]:
        """Get cached RDS instances."""
        if self._rds_cache is None:
            result = await self.db.execute(
                select(RDSInstance).where(
                    RDSInstance.is_deleted == False  # noqa: E712
                )
            )
            self._rds_cache = list(result.scalars().all())
        return self._rds_cache

    async def _compute_standing_access(
        self, user_name: str
    ) -> List[TargetAccessInfo]:
        """Compute standing access: User -> (Role) -> Safe -> Account -> Target."""
        results: List[TargetAccessInfo] = []
        role_ids = await self._get_user_roles(user_name)

        # Find safes where user is a direct member
        direct_safes_result = await self.db.execute(
            select(CyberArkSafeMember.safe_name).where(
                CyberArkSafeMember.member_name == user_name,
                CyberArkSafeMember.member_type == "user",
            )
        )
        direct_safe_names = {row[0] for row in direct_safes_result.all()}

        # Find safes where user's roles are members
        role_safes: Dict[str, str] = {}  # safe_name -> role_id
        if role_ids:
            role_safes_result = await self.db.execute(
                select(
                    CyberArkSafeMember.safe_name,
                    CyberArkSafeMember.member_name,
                ).where(
                    CyberArkSafeMember.member_name.in_(role_ids),
                    CyberArkSafeMember.member_type == "role",
                )
            )
            for safe_name, role_name in role_safes_result.all():
                if safe_name not in direct_safe_names:
                    role_safes[safe_name] = role_name

        all_safe_names = direct_safe_names | set(role_safes.keys())
        if not all_safe_names:
            return results

        # Get accounts in these safes
        accounts_result = await self.db.execute(
            select(CyberArkAccount).where(
                CyberArkAccount.safe_name.in_(all_safe_names),
                CyberArkAccount.is_deleted == False,  # noqa: E712
                CyberArkAccount.address.isnot(None),
                CyberArkAccount.address != "",
            )
        )
        accounts = accounts_result.scalars().all()

        for account in accounts:
            target = await self._match_account_to_target(account.address)
            if not target:
                continue

            target_type, target_id, target_name, target_address, vpc_id, status = (
                target
            )

            # Build access path steps
            steps = [
                AccessPathStep(
                    entity_type="user",
                    entity_id=user_name,
                    entity_name=user_name,
                )
            ]

            if account.safe_name in role_safes:
                steps.append(
                    AccessPathStep(
                        entity_type="role",
                        entity_id=role_safes[account.safe_name],
                        entity_name=role_safes[account.safe_name],
                    )
                )

            steps.extend(
                [
                    AccessPathStep(
                        entity_type="safe",
                        entity_id=account.safe_name,
                        entity_name=account.safe_name,
                    ),
                    AccessPathStep(
                        entity_type="account",
                        entity_id=account.account_id,
                        entity_name=account.account_name,
                    ),
                ]
            )

            results.append(
                TargetAccessInfo(
                    target_type=target_type,
                    target_id=target_id,
                    target_name=target_name,
                    target_address=target_address,
                    vpc_id=vpc_id,
                    display_status=status,
                    access_paths=[
                        AccessPath(access_type="standing", steps=steps)
                    ],
                )
            )

        return results

    async def _compute_jit_access(self, user_name: str) -> List[TargetAccessInfo]:
        """Compute JIT access: User -> (Role) -> SIA Policy -> Target."""
        results: List[TargetAccessInfo] = []
        role_ids = await self._get_user_roles(user_name)

        # Find policies where user is a direct principal
        direct_policies_result = await self.db.execute(
            select(CyberArkSIAPolicyPrincipal.policy_id).where(
                CyberArkSIAPolicyPrincipal.principal_name == user_name,
                CyberArkSIAPolicyPrincipal.principal_type == "user",
            )
        )
        direct_policy_ids = {row[0] for row in direct_policies_result.all()}

        # Find policies where user's roles are principals
        role_policies: Dict[str, str] = {}  # policy_id -> role_id
        if role_ids:
            role_policies_result = await self.db.execute(
                select(
                    CyberArkSIAPolicyPrincipal.policy_id,
                    CyberArkSIAPolicyPrincipal.principal_name,
                ).where(
                    CyberArkSIAPolicyPrincipal.principal_name.in_(role_ids),
                    CyberArkSIAPolicyPrincipal.principal_type == "role",
                )
            )
            for policy_id, role_name in role_policies_result.all():
                if policy_id not in direct_policy_ids:
                    role_policies[policy_id] = role_name

        all_policy_ids = direct_policy_ids | set(role_policies.keys())
        if not all_policy_ids:
            return results

        # Get active policies
        policies_result = await self.db.execute(
            select(CyberArkSIAPolicy).where(
                CyberArkSIAPolicy.policy_id.in_(all_policy_ids),
                CyberArkSIAPolicy.is_deleted == False,  # noqa: E712
                CyberArkSIAPolicy.status == "active",
            )
        )
        policies = policies_result.scalars().all()

        for policy in policies:
            criteria = {}
            if policy.target_criteria:
                try:
                    criteria = (
                        json.loads(policy.target_criteria)
                        if isinstance(policy.target_criteria, str)
                        else policy.target_criteria
                    )
                except (json.JSONDecodeError, TypeError):
                    pass

            matched_targets = await self._match_sia_criteria_to_targets(criteria)

            for target_type, target_id, target_name, addr, vpc_id, status in (
                matched_targets
            ):
                steps = [
                    AccessPathStep(
                        entity_type="user",
                        entity_id=user_name,
                        entity_name=user_name,
                    )
                ]

                if policy.policy_id in role_policies:
                    steps.append(
                        AccessPathStep(
                            entity_type="role",
                            entity_id=role_policies[policy.policy_id],
                            entity_name=role_policies[policy.policy_id],
                        )
                    )

                steps.append(
                    AccessPathStep(
                        entity_type="sia_policy",
                        entity_id=policy.policy_id,
                        entity_name=policy.policy_name,
                    )
                )

                results.append(
                    TargetAccessInfo(
                        target_type=target_type,
                        target_id=target_id,
                        target_name=target_name,
                        target_address=addr,
                        vpc_id=vpc_id,
                        display_status=status,
                        access_paths=[
                            AccessPath(access_type="jit", steps=steps)
                        ],
                    )
                )

        return results

    async def _match_account_to_target(
        self, address: str
    ) -> Optional[Tuple[str, str, Optional[str], str, Optional[str], str]]:
        """Match account address to EC2/RDS target.

        Returns (target_type, target_id, target_name, address, vpc_id, status)
        """
        if not address:
            return None

        address_lower = address.lower().strip()

        # Check EC2 instances
        for ec2 in await self._get_ec2_instances():
            if ec2.private_ip and ec2.private_ip == address_lower:
                return (
                    "ec2", ec2.instance_id, ec2.name, ec2.private_ip,
                    ec2.vpc_id, ec2.display_status,
                )
            if ec2.private_dns and ec2.private_dns.lower() == address_lower:
                return (
                    "ec2", ec2.instance_id, ec2.name,
                    ec2.private_dns, ec2.vpc_id, ec2.display_status,
                )
            if ec2.public_ip and ec2.public_ip == address_lower:
                return (
                    "ec2", ec2.instance_id, ec2.name, ec2.public_ip,
                    ec2.vpc_id, ec2.display_status,
                )
            if ec2.public_dns and ec2.public_dns.lower() == address_lower:
                return (
                    "ec2", ec2.instance_id, ec2.name,
                    ec2.public_dns, ec2.vpc_id, ec2.display_status,
                )

        # Check RDS instances
        for rds in await self._get_rds_instances():
            if rds.endpoint and rds.endpoint.lower() == address_lower:
                return (
                    "rds", rds.db_instance_identifier, rds.name,
                    rds.endpoint, rds.vpc_id, rds.display_status,
                )

        return None

    async def _match_sia_criteria_to_targets(
        self, criteria: Dict[str, Any]
    ) -> List[Tuple[str, str, Optional[str], Optional[str], Optional[str], str]]:
        """Match SIA policy criteria to EC2/RDS instances."""
        if not criteria:
            return []

        matched: List[
            Tuple[str, str, Optional[str], Optional[str], Optional[str], str]
        ] = []
        seen: Set[str] = set()

        vpc_ids = set(criteria.get("vpc_ids", []))
        subnet_ids = set(criteria.get("subnet_ids", []))
        tag_filters = criteria.get("tags", {})
        fqdn_patterns = criteria.get("fqdn_patterns", [])
        ip_ranges = criteria.get("ip_ranges", [])

        # Match EC2 instances
        for ec2 in await self._get_ec2_instances():
            key = f"ec2:{ec2.instance_id}"
            if key in seen:
                continue
            if self._target_matches_criteria(
                ec2.vpc_id, ec2.subnet_id, ec2.tags,
                ec2.private_ip, ec2.private_dns,
                vpc_ids, subnet_ids, tag_filters, fqdn_patterns, ip_ranges,
            ):
                seen.add(key)
                matched.append(
                    (
                        "ec2", ec2.instance_id, ec2.name,
                        ec2.private_ip, ec2.vpc_id, ec2.display_status,
                    )
                )

        # Match RDS instances
        for rds in await self._get_rds_instances():
            key = f"rds:{rds.db_instance_identifier}"
            if key in seen:
                continue
            if self._target_matches_criteria(
                rds.vpc_id, None, rds.tags,
                None, rds.endpoint,
                vpc_ids, subnet_ids, tag_filters, fqdn_patterns, ip_ranges,
            ):
                seen.add(key)
                matched.append(
                    (
                        "rds", rds.db_instance_identifier, rds.name,
                        rds.endpoint, rds.vpc_id, rds.display_status,
                    )
                )

        return matched

    @staticmethod
    def _target_matches_criteria(
        target_vpc_id: Optional[str],
        target_subnet_id: Optional[str],
        target_tags_json: Optional[str],
        target_ip: Optional[str],
        target_fqdn: Optional[str],
        vpc_ids: Set[str],
        subnet_ids: Set[str],
        tag_filters: Dict[str, Any],
        fqdn_patterns: List[str],
        ip_ranges: List[str],
    ) -> bool:
        """Check if a target matches any of the SIA policy criteria."""
        # VPC match
        if vpc_ids and target_vpc_id and target_vpc_id in vpc_ids:
            return True

        # Subnet match
        if subnet_ids and target_subnet_id and target_subnet_id in subnet_ids:
            return True

        # Tag match
        if tag_filters and target_tags_json:
            try:
                target_tags = (
                    json.loads(target_tags_json)
                    if isinstance(target_tags_json, str)
                    else target_tags_json
                )
                if isinstance(target_tags, dict):
                    for key, value in tag_filters.items():
                        if target_tags.get(key) == value:
                            return True
            except (json.JSONDecodeError, TypeError):
                pass

        # FQDN pattern match
        if fqdn_patterns and target_fqdn:
            for pattern in fqdn_patterns:
                try:
                    if re.match(pattern, target_fqdn, re.IGNORECASE):
                        return True
                except re.error:
                    # Treat as suffix match if not a valid regex
                    if target_fqdn.lower().endswith(pattern.lower()):
                        return True

        # IP range (CIDR) match
        if ip_ranges and target_ip:
            try:
                target_addr = ipaddress.ip_address(target_ip)
                for cidr in ip_ranges:
                    try:
                        if target_addr in ipaddress.ip_network(cidr, strict=False):
                            return True
                    except ValueError:
                        pass
            except ValueError:
                pass

        return False
