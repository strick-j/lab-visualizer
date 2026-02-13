"""
Access Mapping Service.

Computes access paths between CyberArk users and AWS targets (EC2/RDS).
Also computes relationship-only paths (user→role, user→safe) for cases
where no AWS target is matched.
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
    CyberArkRole,
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
            if mapping.targets or mapping.access_paths:
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
        """Compute all targets and relationships for a specific user."""
        standing_targets, standing_paths = await self._compute_standing_access(
            user_name
        )
        jit = await self._compute_jit_access(user_name)

        # Merge targets by target_id, combining access paths
        target_map: Dict[str, TargetAccessInfo] = {}
        for t in standing_targets + jit:
            key = f"{t.target_type}:{t.target_id}"
            if key in target_map:
                target_map[key].access_paths.extend(t.access_paths)
            else:
                target_map[key] = t

        return UserAccessMapping(
            user_name=user_name,
            targets=list(target_map.values()),
            access_paths=standing_paths,
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

    async def _get_user_roles(self, user_name: str) -> Dict[str, str]:
        """Get all roles the user is a member of.

        Returns a dict mapping role_id to role_name (display name).
        The role_name is what appears in safe member lists and SIA
        policy principal lists.
        """
        result = await self.db.execute(
            select(CyberArkRoleMember.role_id, CyberArkRole.role_name)
            .join(
                CyberArkRole,
                CyberArkRoleMember.role_id == CyberArkRole.role_id,
            )
            .where(
                CyberArkRoleMember.member_name == user_name,
                CyberArkRoleMember.member_type == "user",
            )
        )
        return {row[0]: row[1] for row in result.all()}

    async def _get_ec2_instances(self) -> List[EC2Instance]:
        """Get cached EC2 instances."""
        if self._ec2_cache is None:
            result = await self.db.execute(
                select(EC2Instance).where(EC2Instance.is_deleted == False)  # noqa: E712
            )
            self._ec2_cache = list(result.scalars().all())
        return self._ec2_cache

    async def _get_rds_instances(self) -> List[RDSInstance]:
        """Get cached RDS instances."""
        if self._rds_cache is None:
            result = await self.db.execute(
                select(RDSInstance).where(RDSInstance.is_deleted == False)  # noqa: E712
            )
            self._rds_cache = list(result.scalars().all())
        return self._rds_cache

    async def _compute_standing_access(
        self, user_name: str
    ) -> Tuple[List[TargetAccessInfo], List[AccessPath]]:
        """Compute standing access: User -> (Role) -> Safe -> Account -> Target.

        Returns a tuple of (target_results, relationship_paths).
        - target_results: paths that reach a matched AWS target
        - relationship_paths: paths that show relationships without a target
          (e.g. user→role, user→safe, user→role→safe→account)
        """
        target_results: List[TargetAccessInfo] = []
        relationship_paths: List[AccessPath] = []

        role_map = await self._get_user_roles(user_name)
        role_names = set(role_map.values())

        # Find safes where user is a direct member
        direct_safes_result = await self.db.execute(
            select(CyberArkSafeMember.safe_name).where(
                CyberArkSafeMember.member_name == user_name,
                CyberArkSafeMember.member_type == "user",
            )
        )
        direct_safe_names = {row[0] for row in direct_safes_result.all()}

        # Find safes where user's roles are members.
        # CyberArk safe members may have memberType "Role" or "Group"
        # (lowercased to "role" or "group" by the collector).  Match both.
        role_safes: Dict[str, str] = {}  # safe_name -> role_name
        if role_names:
            role_safes_result = await self.db.execute(
                select(
                    CyberArkSafeMember.safe_name,
                    CyberArkSafeMember.member_name,
                ).where(
                    CyberArkSafeMember.member_name.in_(role_names),
                    CyberArkSafeMember.member_type.in_(["role", "group"]),
                )
            )
            for safe_name, member_name in role_safes_result.all():
                if safe_name not in direct_safe_names:
                    role_safes[safe_name] = member_name

        all_safe_names = direct_safe_names | set(role_safes.keys())

        # Get accounts in these safes
        accounts: list = []
        if all_safe_names:
            accounts_result = await self.db.execute(
                select(CyberArkAccount).where(
                    CyberArkAccount.safe_name.in_(all_safe_names),
                    CyberArkAccount.is_deleted == False,  # noqa: E712
                )
            )
            accounts = list(accounts_result.scalars().all())

        safes_with_accounts: Set[str] = set()

        for account in accounts:
            safes_with_accounts.add(account.safe_name)

            # Build access path steps
            steps = [
                AccessPathStep(
                    entity_type="user",
                    entity_id=user_name,
                    entity_name=user_name,
                )
            ]

            if account.safe_name in role_safes:
                role_name = role_safes[account.safe_name]
                steps.append(
                    AccessPathStep(
                        entity_type="role",
                        entity_id=role_name,
                        entity_name=role_name,
                    )
                )

            # Build account context with available metadata
            account_context: Dict[str, Any] = {}
            if account.platform_id:
                account_context["platform_id"] = account.platform_id
            if account.username:
                account_context["username"] = account.username
            if account.secret_type:
                account_context["secret_type"] = account.secret_type
            if account.address:
                account_context["address"] = account.address

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
                        context=account_context if account_context else None,
                    ),
                ]
            )

            # Try to match account address to an AWS target
            target = None
            if account.address:
                target = await self._match_account_to_target(account.address)

            if target:
                (
                    target_type,
                    target_id,
                    target_name,
                    target_address,
                    vpc_id,
                    status,
                    inst_type,
                    engine,
                    platform,
                ) = target
                target_results.append(
                    TargetAccessInfo(
                        target_type=target_type,
                        target_id=target_id,
                        target_name=target_name,
                        target_address=target_address,
                        vpc_id=vpc_id,
                        display_status=status,
                        instance_type=inst_type,
                        engine=engine,
                        platform=platform,
                        access_paths=[AccessPath(access_type="standing", steps=steps)],
                    )
                )
            else:
                # Account without a matching AWS target — still show the path
                relationship_paths.append(
                    AccessPath(access_type="standing", steps=steps)
                )

        # For safes with no accounts, show user→(role→)safe relationship
        for safe_name in all_safe_names - safes_with_accounts:
            steps = [
                AccessPathStep(
                    entity_type="user",
                    entity_id=user_name,
                    entity_name=user_name,
                )
            ]
            if safe_name in role_safes:
                role_name = role_safes[safe_name]
                steps.append(
                    AccessPathStep(
                        entity_type="role",
                        entity_id=role_name,
                        entity_name=role_name,
                    )
                )
            steps.append(
                AccessPathStep(
                    entity_type="safe",
                    entity_id=safe_name,
                    entity_name=safe_name,
                )
            )
            relationship_paths.append(AccessPath(access_type="standing", steps=steps))

        # For roles that have no safe membership at all, show user→role
        roles_in_safes = set(role_safes.values())
        for _role_id, role_name in role_map.items():
            if role_name not in roles_in_safes:
                steps = [
                    AccessPathStep(
                        entity_type="user",
                        entity_id=user_name,
                        entity_name=user_name,
                    ),
                    AccessPathStep(
                        entity_type="role",
                        entity_id=role_name,
                        entity_name=role_name,
                    ),
                ]
                relationship_paths.append(
                    AccessPath(access_type="standing", steps=steps)
                )

        return target_results, relationship_paths

    async def _compute_jit_access(self, user_name: str) -> List[TargetAccessInfo]:
        """Compute JIT access: User -> (Role) -> SIA Policy -> Target."""
        results: List[TargetAccessInfo] = []
        role_map = await self._get_user_roles(user_name)
        role_names = set(role_map.values())

        # Find policies where user is a direct principal
        direct_policies_result = await self.db.execute(
            select(CyberArkSIAPolicyPrincipal.policy_id).where(
                CyberArkSIAPolicyPrincipal.principal_name == user_name,
                CyberArkSIAPolicyPrincipal.principal_type == "user",
            )
        )
        direct_policy_ids = {row[0] for row in direct_policies_result.all()}

        # Find policies where user's roles are principals
        role_policies: Dict[str, str] = {}  # policy_id -> role_name
        if role_names:
            role_policies_result = await self.db.execute(
                select(
                    CyberArkSIAPolicyPrincipal.policy_id,
                    CyberArkSIAPolicyPrincipal.principal_name,
                ).where(
                    CyberArkSIAPolicyPrincipal.principal_name.in_(role_names),
                    CyberArkSIAPolicyPrincipal.principal_type == "role",
                )
            )
            for policy_id, role_name in role_policies_result.all():
                if policy_id not in direct_policy_ids:
                    role_policies[policy_id] = role_name

        all_policy_ids = direct_policy_ids | set(role_policies.keys())
        if not all_policy_ids:
            logger.debug(
                "JIT: no SIA policies matched for user %s "
                "(direct=%d, role-based=%d, roles=%s)",
                user_name,
                len(direct_policy_ids),
                len(role_policies),
                list(role_names)[:10],
            )
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
        logger.debug(
            "JIT: user %s matched %d policies (%d active)",
            user_name,
            len(all_policy_ids),
            len(policies),
        )

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
            logger.debug(
                "JIT: policy %s (%s) criteria_keys=%s matched %d targets",
                policy.policy_id,
                policy.policy_name,
                list(criteria.keys()) if criteria else [],
                len(matched_targets),
            )

            for (
                target_type,
                target_id,
                target_name,
                addr,
                vpc_id,
                status,
                inst_type,
                engine,
                platform,
            ) in matched_targets:
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
                        instance_type=inst_type,
                        engine=engine,
                        platform=platform,
                        access_paths=[AccessPath(access_type="jit", steps=steps)],
                    )
                )

        return results

    async def _match_account_to_target(self, address: str) -> Optional[
        Tuple[
            str,
            str,
            Optional[str],
            str,
            Optional[str],
            str,
            Optional[str],
            Optional[str],
            Optional[str],
        ]
    ]:
        """Match account address to EC2/RDS target.

        Returns (target_type, target_id, target_name, address, vpc_id, status,
                 instance_type, engine, platform)
        """
        if not address:
            return None

        address_lower = address.lower().strip()

        # Check EC2 instances
        for ec2 in await self._get_ec2_instances():
            ec2_match_addr = None
            if ec2.private_ip and ec2.private_ip == address_lower:
                ec2_match_addr = ec2.private_ip
            elif ec2.private_dns and ec2.private_dns.lower() == address_lower:
                ec2_match_addr = ec2.private_dns
            elif ec2.public_ip and ec2.public_ip == address_lower:
                ec2_match_addr = ec2.public_ip
            elif ec2.public_dns and ec2.public_dns.lower() == address_lower:
                ec2_match_addr = ec2.public_dns

            if ec2_match_addr:
                return (
                    "ec2",
                    ec2.instance_id,
                    ec2.name,
                    ec2_match_addr,
                    ec2.vpc_id,
                    ec2.display_status,
                    ec2.instance_type,
                    None,
                    None,
                )

        # Check RDS instances
        for rds in await self._get_rds_instances():
            if rds.endpoint and rds.endpoint.lower() == address_lower:
                return (
                    "rds",
                    rds.db_instance_identifier,
                    rds.name,
                    rds.endpoint,
                    rds.vpc_id,
                    rds.display_status,
                    rds.db_instance_class,
                    rds.engine,
                    rds.engine,
                )

        return None

    async def _match_sia_criteria_to_targets(self, criteria: Dict[str, Any]) -> List[
        Tuple[
            str,
            str,
            Optional[str],
            Optional[str],
            Optional[str],
            str,
            Optional[str],
            Optional[str],
            Optional[str],
        ]
    ]:
        """Match SIA policy criteria to EC2/RDS instances."""
        if not criteria:
            return []

        # Unrestricted policies with all target arrays empty match ALL targets
        if criteria.get("match_all"):
            return await self._all_targets()

        matched: List[
            Tuple[
                str,
                str,
                Optional[str],
                Optional[str],
                Optional[str],
                str,
                Optional[str],
                Optional[str],
                Optional[str],
            ]
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
                ec2.vpc_id,
                ec2.subnet_id,
                ec2.tags,
                ec2.private_ip,
                ec2.private_dns,
                vpc_ids,
                subnet_ids,
                tag_filters,
                fqdn_patterns,
                ip_ranges,
            ):
                seen.add(key)
                matched.append(
                    (
                        "ec2",
                        ec2.instance_id,
                        ec2.name,
                        ec2.private_ip,
                        ec2.vpc_id,
                        ec2.display_status,
                        ec2.instance_type,
                        None,
                        None,
                    )
                )

        # Match RDS instances
        for rds in await self._get_rds_instances():
            key = f"rds:{rds.db_instance_identifier}"
            if key in seen:
                continue
            if self._target_matches_criteria(
                rds.vpc_id,
                None,
                rds.tags,
                None,
                rds.endpoint,
                vpc_ids,
                subnet_ids,
                tag_filters,
                fqdn_patterns,
                ip_ranges,
            ):
                seen.add(key)
                matched.append(
                    (
                        "rds",
                        rds.db_instance_identifier,
                        rds.name,
                        rds.endpoint,
                        rds.vpc_id,
                        rds.display_status,
                        rds.db_instance_class,
                        rds.engine,
                        rds.engine,
                    )
                )

        return matched

    async def _all_targets(
        self,
    ) -> List[
        Tuple[
            str,
            str,
            Optional[str],
            Optional[str],
            Optional[str],
            str,
            Optional[str],
            Optional[str],
            Optional[str],
        ]
    ]:
        """Return all EC2/RDS instances (for unrestricted match-all policies)."""
        results: List[
            Tuple[
                str,
                str,
                Optional[str],
                Optional[str],
                Optional[str],
                str,
                Optional[str],
                Optional[str],
                Optional[str],
            ]
        ] = []
        for ec2 in await self._get_ec2_instances():
            results.append(
                (
                    "ec2",
                    ec2.instance_id,
                    ec2.name,
                    ec2.private_ip,
                    ec2.vpc_id,
                    ec2.display_status,
                    ec2.instance_type,
                    None,
                    None,
                )
            )
        for rds in await self._get_rds_instances():
            results.append(
                (
                    "rds",
                    rds.db_instance_identifier,
                    rds.name,
                    rds.endpoint,
                    rds.vpc_id,
                    rds.display_status,
                    rds.db_instance_class,
                    rds.engine,
                    rds.engine,
                )
            )
        return results

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
                    for key, values in tag_filters.items():
                        target_val = target_tags.get(key)
                        if target_val is not None:
                            # Support multi-value lists (e.g. ["linux", "unix"])
                            if isinstance(values, list):
                                if target_val in values:
                                    return True
                            elif target_val == values:
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
