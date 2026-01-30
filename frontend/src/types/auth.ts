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
  saml_idp_entity_id: string | null;
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
