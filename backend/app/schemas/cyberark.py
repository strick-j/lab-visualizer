"""
Pydantic schemas for CyberArk resources and access mapping.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# CyberArk Safe Schemas
# =============================================================================


class CyberArkSafeMemberResponse(BaseSchema):
    """Safe member response schema."""

    id: int
    safe_name: str
    member_name: str
    member_type: str  # user, group, role
    permission_level: Optional[str] = None


class CyberArkAccountBrief(BaseSchema):
    """Brief account info for safe detail views."""

    id: int
    account_id: str
    account_name: str
    platform_id: Optional[str] = None
    address: Optional[str] = None
    username: Optional[str] = None
    secret_type: Optional[str] = None
    tf_managed: bool = False


class CyberArkSafeResponse(BaseSchema):
    """CyberArk safe response schema."""

    id: int
    safe_name: str
    description: Optional[str] = None
    managing_cpm: Optional[str] = None
    number_of_members: int = 0
    number_of_accounts: int = 0
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    is_deleted: bool = False
    updated_at: datetime


class CyberArkSafeDetail(CyberArkSafeResponse):
    """Detailed safe response with members and accounts."""

    members: List[CyberArkSafeMemberResponse] = []
    accounts: List[CyberArkAccountBrief] = []
    created_at: datetime


# =============================================================================
# CyberArk Account Schemas
# =============================================================================


class CyberArkAccountResponse(BaseSchema):
    """CyberArk account response schema."""

    id: int
    account_id: str
    account_name: str
    safe_name: str
    platform_id: Optional[str] = None
    address: Optional[str] = None
    username: Optional[str] = None
    secret_type: Optional[str] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    is_deleted: bool = False
    updated_at: datetime


# =============================================================================
# CyberArk Role Schemas
# =============================================================================


class CyberArkRoleMemberResponse(BaseSchema):
    """Role member response schema."""

    id: int
    role_id: str
    member_name: str
    member_type: str  # user, group


class CyberArkRoleResponse(BaseSchema):
    """CyberArk role response schema."""

    id: int
    role_id: str
    role_name: str
    description: Optional[str] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    is_deleted: bool = False
    updated_at: datetime


class CyberArkRoleDetail(CyberArkRoleResponse):
    """Detailed role response with members."""

    members: List[CyberArkRoleMemberResponse] = []
    created_at: datetime


# =============================================================================
# CyberArk SIA Policy Schemas
# =============================================================================


class CyberArkSIAPolicyPrincipalResponse(BaseSchema):
    """SIA policy principal response schema."""

    id: int
    policy_id: str
    principal_name: str
    principal_type: str  # user, role


class CyberArkSIAPolicyResponse(BaseSchema):
    """CyberArk SIA policy response schema."""

    id: int
    policy_id: str
    policy_name: str
    policy_type: str  # vm, database
    description: Optional[str] = None
    status: str
    target_criteria: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    is_deleted: bool = False
    updated_at: datetime


class CyberArkSIAPolicyDetail(CyberArkSIAPolicyResponse):
    """Detailed SIA policy response with principals."""

    principals: List[CyberArkSIAPolicyPrincipalResponse] = []
    created_at: datetime


# =============================================================================
# Access Mapping Schemas
# =============================================================================


class AccessPathStep(BaseSchema):
    """A single step in an access path."""

    entity_type: str  # user, role, safe, account, sia_policy
    entity_id: str
    entity_name: str
    context: Optional[Dict[str, Any]] = None


class AccessPath(BaseSchema):
    """A complete access path from user to target."""

    access_type: str  # standing, jit
    steps: List[AccessPathStep]


class TargetAccessInfo(BaseSchema):
    """Information about a target and the access paths to it."""

    target_type: str  # ec2, rds
    target_id: str
    target_name: Optional[str] = None
    target_address: Optional[str] = None
    vpc_id: Optional[str] = None
    display_status: Optional[str] = None
    instance_type: Optional[str] = None  # EC2 instance type or RDS instance class
    engine: Optional[str] = None  # RDS engine (e.g., "postgres", "mysql")
    platform: Optional[str] = None  # Platform label (e.g., "Linux", "PostgreSQL")
    tf_managed: bool = False
    access_paths: List[AccessPath] = []


class UserAccessMapping(BaseSchema):
    """All targets accessible by a specific user."""

    user_name: str
    targets: List[TargetAccessInfo] = []
    access_paths: List[AccessPath] = []  # Relationship-only paths (no target)


class AccessMappingResponse(BaseSchema):
    """Response for the access mapping visualization endpoint."""

    users: List[UserAccessMapping] = []
    total_users: int = 0
    total_targets: int = 0
    total_standing_paths: int = 0
    total_jit_paths: int = 0


class AccessMappingUserList(BaseSchema):
    """List of users available for access mapping."""

    users: List[str] = []


class AccessMappingTargetBrief(BaseSchema):
    """Brief target info for the access mapping filter dropdown."""

    target_type: str
    target_id: str
    target_name: Optional[str] = None
    target_address: Optional[str] = None


class AccessMappingTargetList(BaseSchema):
    """List of targets available for access mapping."""

    targets: List[AccessMappingTargetBrief] = []


# =============================================================================
# CyberArk Settings Schemas
# =============================================================================


class CyberArkUserResponse(BaseSchema):
    """CyberArk Identity user response schema."""

    id: int
    user_id: str
    user_name: str
    display_name: Optional[str] = None
    email: Optional[str] = None
    active: bool = True
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    is_deleted: bool = False
    updated_at: datetime


class CyberArkUserListResponse(BaseSchema):
    """CyberArk user list response."""

    data: List[CyberArkUserResponse] = []
    meta: Dict[str, Any] = {}


# =============================================================================
# CyberArk Settings Schemas
# =============================================================================


class CyberArkSettingsResponse(BaseSchema):
    """CyberArk settings response."""

    tenant_name: Optional[str] = None
    enabled: bool = False
    base_url: Optional[str] = None
    identity_url: Optional[str] = None
    uap_base_url: Optional[str] = None
    client_id: Optional[str] = None
    has_client_secret: bool = False
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class CyberArkSettingsUpdate(BaseSchema):
    """CyberArk settings update request."""

    tenant_name: Optional[str] = None
    enabled: Optional[bool] = None
    base_url: Optional[str] = None
    identity_url: Optional[str] = None
    uap_base_url: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


class CyberArkConnectionTestRequest(BaseSchema):
    """Request to test CyberArk API connection."""

    base_url: str
    identity_url: str
    client_id: str
    client_secret: Optional[str] = None


class TenantDiscoveryRequest(BaseSchema):
    """Request to discover CyberArk tenant URLs."""

    subdomain: str


class TenantDiscoveryResponse(BaseSchema):
    """Response from CyberArk tenant discovery."""

    success: bool
    base_url: Optional[str] = None
    identity_url: Optional[str] = None
    uap_base_url: Optional[str] = None
    region: Optional[str] = None
    message: Optional[str] = None


class CyberArkConnectionTestResponse(BaseSchema):
    """Response from CyberArk connection test."""

    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# =============================================================================
# SCIM Settings Schemas
# =============================================================================


class ScimSettingsResponse(BaseSchema):
    """SCIM integration settings response."""

    scim_enabled: bool = False
    scim_app_id: Optional[str] = None
    scim_oauth2_url: Optional[str] = None
    scim_scope: Optional[str] = None
    scim_client_id: Optional[str] = None
    has_scim_client_secret: bool = False
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None


class ScimSettingsUpdate(BaseSchema):
    """SCIM settings update request."""

    scim_enabled: Optional[bool] = None
    scim_app_id: Optional[str] = None
    scim_scope: Optional[str] = None
    scim_client_id: Optional[str] = None
    scim_client_secret: Optional[str] = None


class ScimConnectionTestRequest(BaseSchema):
    """Request to test SCIM OAuth2 connection."""

    scim_app_id: Optional[str] = None
    scim_oauth2_url: Optional[str] = None
    scim_scope: str
    scim_client_id: str
    scim_client_secret: Optional[str] = None


class ScimConnectionTestResponse(BaseSchema):
    """Response from SCIM connection test."""

    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None
