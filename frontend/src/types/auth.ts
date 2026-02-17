export type UserRole = "viewer" | "user" | "admin";

export interface User {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  auth_provider: "local" | "oidc";
  is_active: boolean;
  is_admin: boolean;
  role: UserRole;
  last_login_at: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthConfig {
  local_auth_enabled: boolean;
  oidc_enabled: boolean;
  oidc_issuer: string | null;
  oidc_display_name: string | null;
  setup_required: boolean;
}

export interface OIDCLoginResponse {
  auth_url: string;
  state: string;
}

// Settings types
export interface OIDCSettings {
  enabled: boolean;
  issuer: string | null;
  client_id: string | null;
  client_secret_configured: boolean;
  display_name: string;
  access_token_expire_minutes: number;
  refresh_token_expire_days: number;
  role_claim: string | null;
  admin_groups: string | null;
  user_groups: string | null;
  viewer_groups: string | null;
  default_role: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface AuthSettingsResponse {
  local_auth_enabled: boolean;
  oidc: OIDCSettings;
}

export interface OIDCSettingsUpdate {
  enabled: boolean;
  issuer?: string;
  client_id?: string;
  client_secret?: string;
  display_name?: string;
  access_token_expire_minutes?: number;
  refresh_token_expire_days?: number;
  role_claim?: string;
  admin_groups?: string;
  user_groups?: string;
  viewer_groups?: string;
  default_role?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, string>;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

export interface AdminSetupRequest {
  username: string;
  password: string;
  confirm_password: string;
}

export interface SetupStatusResponse {
  setup_required: boolean;
  message: string;
}

// Terraform State Bucket types
export interface TerraformPath {
  id: number;
  bucket_id: number;
  path: string;
  description: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TerraformPathCreate {
  path: string;
  description?: string;
  enabled?: boolean;
}

export interface TerraformPathUpdate {
  path?: string;
  description?: string;
  enabled?: boolean;
}

export interface TerraformBucket {
  id: number;
  bucket_name: string;
  region: string | null;
  description: string | null;
  prefix: string | null;
  excluded_paths: string | null;
  enabled: boolean;
  source: string;
  paths: TerraformPath[];
  created_at: string;
  updated_at: string;
}

export interface TerraformBucketsListResponse {
  buckets: TerraformBucket[];
  total: number;
}

export interface TerraformBucketCreate {
  bucket_name: string;
  region?: string;
  description?: string;
  prefix?: string;
  excluded_paths?: string;
  enabled?: boolean;
}

export interface TerraformBucketUpdate {
  bucket_name?: string;
  region?: string;
  description?: string;
  prefix?: string;
  excluded_paths?: string;
  enabled?: boolean;
}

// S3 Bucket Test & Browse types
export interface S3BucketTestResponse {
  success: boolean;
  message: string;
  details?: Record<string, string>;
}

export interface S3ObjectInfo {
  key: string;
  is_prefix: boolean;
  size?: number;
  last_modified?: string;
}

export interface S3BucketListResponse {
  success: boolean;
  message: string;
  objects: S3ObjectInfo[];
  prefix: string;
  bucket_name: string;
}

// User Management types
export interface UserListResponse {
  users: User[];
  total: number;
}

export interface UserStatusUpdate {
  is_active: boolean;
}

export interface UserRoleUpdate {
  role: UserRole;
}
