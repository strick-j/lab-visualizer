// =============================================================================
// CyberArk Resource Types
// =============================================================================

export interface CyberArkSafe {
  id: number;
  safe_name: string;
  description: string | null;
  managing_cpm: string | null;
  number_of_members: number;
  number_of_accounts: number;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  is_deleted: boolean;
  updated_at: string;
}

export interface CyberArkSafeMember {
  id: number;
  safe_name: string;
  member_name: string;
  member_type: string;
  permission_level: string | null;
}

export interface CyberArkAccountBrief {
  id: number;
  account_id: string;
  account_name: string;
  platform_id: string | null;
  address: string | null;
  username: string | null;
  secret_type: string | null;
  tf_managed: boolean;
}

export interface CyberArkSafeDetail extends CyberArkSafe {
  members: CyberArkSafeMember[];
  accounts: CyberArkAccountBrief[];
  created_at: string;
}

export interface CyberArkAccount {
  id: number;
  account_id: string;
  account_name: string;
  safe_name: string;
  platform_id: string | null;
  address: string | null;
  username: string | null;
  secret_type: string | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  is_deleted: boolean;
  updated_at: string;
}

export interface CyberArkRole {
  id: number;
  role_id: string;
  role_name: string;
  description: string | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  is_deleted: boolean;
  updated_at: string;
}

export interface CyberArkRoleMember {
  id: number;
  role_id: string;
  member_name: string;
  member_type: string;
}

export interface CyberArkRoleDetail extends CyberArkRole {
  members: CyberArkRoleMember[];
  created_at: string;
}

export interface CyberArkSIAPolicy {
  id: number;
  policy_id: string;
  policy_name: string;
  policy_type: string;
  description: string | null;
  status: string;
  target_criteria: Record<string, unknown> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  is_deleted: boolean;
  updated_at: string;
}

export interface CyberArkSIAPolicyPrincipal {
  id: number;
  policy_id: string;
  principal_name: string;
  principal_type: string;
}

export interface CyberArkSIAPolicyDetail extends CyberArkSIAPolicy {
  principals: CyberArkSIAPolicyPrincipal[];
  created_at: string;
}

// =============================================================================
// CyberArk Page Types
// =============================================================================

export type CyberArkResourceType = "safes" | "roles" | "sia-policies";

export interface CyberArkFilters {
  search?: string;
  tf_managed?: boolean;
  policy_type?: string;
}

// =============================================================================
// CyberArk List Response Types
// =============================================================================

export interface CyberArkSafeListResponse {
  data: CyberArkSafe[];
  meta: { total: number; last_refreshed: string | null };
}

export interface CyberArkRoleListResponse {
  data: CyberArkRole[];
  meta: { total: number; last_refreshed: string | null };
}

export interface CyberArkSIAPolicyListResponse {
  data: CyberArkSIAPolicy[];
  meta: { total: number; last_refreshed: string | null };
}

// =============================================================================
// Access Mapping Types
// =============================================================================

export interface AccessPathStep {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  context?: Record<string, unknown> | null;
}

export interface AccessPath {
  access_type: "standing" | "jit";
  steps: AccessPathStep[];
}

export interface TargetAccessInfo {
  target_type: "ec2" | "rds";
  target_id: string;
  target_name: string | null;
  target_address: string | null;
  vpc_id: string | null;
  display_status: string | null;
  instance_type: string | null;
  engine: string | null;
  platform: string | null;
  access_paths: AccessPath[];
}

export interface UserAccessMapping {
  user_name: string;
  targets: TargetAccessInfo[];
  access_paths?: AccessPath[];
}

export interface AccessMappingResponse {
  users: UserAccessMapping[];
  total_users: number;
  total_targets: number;
  total_standing_paths: number;
  total_jit_paths: number;
}

export interface AccessMappingUserList {
  users: string[];
}

export interface AccessMappingTargetBrief {
  target_type: string;
  target_id: string;
  target_name: string | null;
  target_address: string | null;
}

export interface AccessMappingTargetList {
  targets: AccessMappingTargetBrief[];
}

// =============================================================================
// Access Mapping Node Data (Collapsible)
// =============================================================================

export interface AccessNodeChildSummary {
  roleCount?: number;
  safeCount?: number;
  policyCount?: number;
  accountCount?: number;
  targetCount?: number;
  standingCount?: number;
  jitCount?: number;
}

export interface CollapsibleNodeData {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  childSummary?: AccessNodeChildSummary;
}

// =============================================================================
// CyberArk User Types (SCIM)
// =============================================================================

export interface CyberArkIdentityUser {
  id: number;
  user_id: string;
  user_name: string;
  display_name: string | null;
  email: string | null;
  active: boolean;
  is_deleted: boolean;
  updated_at: string;
}

export interface CyberArkUserListResponse {
  data: CyberArkIdentityUser[];
  meta: { total: number; last_refreshed: string | null };
}

// =============================================================================
// CyberArk Settings Types
// =============================================================================

export interface CyberArkSettingsResponse {
  tenant_name: string | null;
  enabled: boolean;
  base_url: string | null;
  identity_url: string | null;
  uap_base_url: string | null;
  client_id: string | null;
  has_client_secret: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface CyberArkSettingsUpdate {
  tenant_name?: string;
  enabled?: boolean;
  base_url?: string;
  identity_url?: string;
  uap_base_url?: string;
  client_id?: string;
  client_secret?: string;
}

export interface CyberArkConnectionTestRequest {
  base_url: string;
  identity_url: string;
  client_id: string;
  client_secret?: string;
}

export interface TenantDiscoveryRequest {
  subdomain: string;
}

export interface TenantDiscoveryResponse {
  success: boolean;
  base_url: string | null;
  identity_url: string | null;
  uap_base_url: string | null;
  region: string | null;
  message: string | null;
}

export interface CyberArkConnectionTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface CyberArkSyncStatus {
  config: {
    source: string;
    enabled: boolean;
    all_fields_set: boolean;
    db_settings_exists: boolean;
    db_enabled: boolean | null;
    db_base_url_set: boolean;
    db_identity_url_set: boolean;
    db_client_id_set: boolean;
    db_client_secret_set: boolean;
  };
  database_counts: {
    roles_total: number;
    roles_active: number;
    safes: number;
    accounts: number;
    sia_policies: number;
    users: number;
  };
  last_sync: {
    synced_at: string | null;
    status: string | null;
    resource_count: number | null;
  };
}

// =============================================================================
// SCIM Settings Types
// =============================================================================

export interface ScimSettingsResponse {
  scim_enabled: boolean;
  scim_app_id: string | null;
  scim_oauth2_url: string | null;
  scim_scope: string | null;
  scim_client_id: string | null;
  has_scim_client_secret: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface ScimSettingsUpdate {
  scim_enabled?: boolean;
  scim_app_id?: string;
  scim_scope?: string;
  scim_client_id?: string;
  scim_client_secret?: string;
}

export interface ScimConnectionTestRequest {
  scim_app_id?: string;
  scim_oauth2_url?: string;
  scim_scope: string;
  scim_client_id: string;
  scim_client_secret?: string;
}

export interface ScimConnectionTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// CyberArk Drift Types
// =============================================================================

export interface CyberArkDriftResponse {
  drift_detected: boolean;
  items: Array<{
    resource_type: string;
    resource_id: string;
    drift_type: "unmanaged" | "orphaned" | "modified";
    details: string | null;
  }>;
  checked_at: string;
}
