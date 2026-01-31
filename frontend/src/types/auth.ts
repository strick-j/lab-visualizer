export interface User {
  id: number;
  username: string;
  email: string | null;
  display_name: string | null;
  auth_provider: 'local' | 'oidc' | 'saml';
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
  saml_enabled: boolean;
  oidc_issuer: string | null;
  oidc_display_name: string | null;
  saml_idp_entity_id: string | null;
  saml_display_name: string | null;
}

export interface OIDCLoginResponse {
  auth_url: string;
  state: string;
}

export interface SAMLLoginResponse {
  sso_url: string;
  relay_state: string;
  callback_url: string;
  message: string;
}

// Settings types
export interface OIDCSettings {
  enabled: boolean;
  issuer: string | null;
  client_id: string | null;
  client_secret_configured: boolean;
  display_name: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface SAMLSettings {
  enabled: boolean;
  idp_entity_id: string | null;
  idp_sso_url: string | null;
  idp_certificate_configured: boolean;
  sp_entity_id: string | null;
  display_name: string;
  updated_at: string | null;
  updated_by: string | null;
}

export interface AuthSettingsResponse {
  local_auth_enabled: boolean;
  oidc: OIDCSettings;
  saml: SAMLSettings;
}

export interface OIDCSettingsUpdate {
  enabled: boolean;
  issuer?: string;
  client_id?: string;
  client_secret?: string;
  display_name?: string;
}

export interface SAMLSettingsUpdate {
  enabled: boolean;
  idp_entity_id?: string;
  idp_sso_url?: string;
  idp_certificate?: string;
  sp_entity_id?: string;
  display_name?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  details?: Record<string, string>;
}
