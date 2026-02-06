export interface User {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  auth_provider: "local" | "oidc";
  is_active: boolean;
  is_admin: boolean;
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
