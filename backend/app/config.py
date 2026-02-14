"""
Application configuration using Pydantic Settings.

Loads configuration from environment variables and .env files.
"""

import logging
import warnings
from functools import lru_cache
from typing import List, Optional

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # -------------------------------------------------------------------------
    # AWS Configuration
    # -------------------------------------------------------------------------
    aws_region: str = Field(default="us-east-1", description="AWS region")
    aws_account_id: Optional[str] = Field(default=None, description="AWS account ID")
    aws_profile: Optional[str] = Field(default=None, description="AWS profile name")

    # -------------------------------------------------------------------------
    # Terraform State Configuration
    # -------------------------------------------------------------------------
    tf_state_bucket: Optional[str] = Field(
        default=None, description="S3 bucket containing Terraform state files"
    )
    tf_state_config: str = Field(
        default="config/terraform-states.yml",
        description="Path to Terraform states configuration file",
    )
    tf_state_keys: Optional[str] = Field(
        default=None,
        description="Comma-separated list of state file keys (alternative to config file)",
    )

    # -------------------------------------------------------------------------
    # Database
    # -------------------------------------------------------------------------
    database_url: str = Field(
        default="sqlite:///./data/app.db", description="Database connection URL"
    )

    # -------------------------------------------------------------------------
    # Authentication
    # -------------------------------------------------------------------------
    # Local authentication
    local_auth_enabled: bool = Field(
        default=True, description="Enable local username/password authentication"
    )

    # Admin credentials (optional - set to auto-create admin on startup)
    admin_username: Optional[str] = Field(
        default=None,
        description="Admin username for auto-provisioning on startup",
    )
    admin_password: Optional[str] = Field(
        default=None,
        description="Admin password for auto-provisioning on startup (stored in Secrets Manager)",
    )

    # OIDC authentication
    oidc_issuer: Optional[str] = Field(
        default=None, description="OIDC identity provider issuer URL"
    )
    oidc_client_id: Optional[str] = Field(default=None, description="OIDC client ID")
    oidc_client_secret: Optional[str] = Field(
        default=None, description="OIDC client secret"
    )

    # Session configuration
    session_secret: str = Field(
        default="change-me-in-production",
        description="Secret key for session signing",
    )
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration time in minutes"
    )
    refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration time in days"
    )

    # -------------------------------------------------------------------------
    # Application Settings
    # -------------------------------------------------------------------------
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    # nosec B104 - Binding to 0.0.0.0 is intentional for containerized deployment
    api_host: str = Field(default="0.0.0.0", description="API host")  # nosec B104
    api_port: int = Field(default=8000, description="API port")

    # CORS
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="Comma-separated list of allowed CORS origins",
    )

    # Frontend URL for SSO callback redirects
    frontend_url: Optional[str] = Field(
        default=None,
        description="Frontend URL for SSO callback redirects (e.g., http://192.168.1.100:3000)",
    )

    # -------------------------------------------------------------------------
    # CyberArk Integration
    # -------------------------------------------------------------------------
    cyberark_enabled: bool = Field(
        default=False, description="Enable CyberArk integration"
    )
    cyberark_base_url: Optional[str] = Field(
        default=None, description="CyberArk Privilege Cloud base URL"
    )
    cyberark_identity_url: Optional[str] = Field(
        default=None, description="CyberArk Identity tenant URL"
    )
    cyberark_client_id: Optional[str] = Field(
        default=None, description="CyberArk API client ID"
    )
    cyberark_client_secret: Optional[str] = Field(
        default=None, description="CyberArk API client secret"
    )
    cyberark_uap_base_url: Optional[str] = Field(
        default=None,
        description="CyberArk UAP (Unified Access Portal) base URL for SIA policies",
    )

    # Configurable TF resource type names (idsec provider)
    cyberark_tf_safe_type: str = Field(
        default="idsec_pcloud_safe",
        description="Terraform resource type for CyberArk Safe",
    )
    cyberark_tf_safe_member_type: str = Field(
        default="idsec_pcloud_safe_member",
        description="Terraform resource type for CyberArk Safe Member",
    )
    cyberark_tf_account_type: str = Field(
        default="idsec_pcloud_account",
        description="Terraform resource type for CyberArk Account",
    )
    cyberark_tf_role_type: str = Field(
        default="idsec_identity_role",
        description="Terraform resource type for CyberArk Role",
    )
    cyberark_tf_user_type: str = Field(
        default="idsec_identity_user",
        description="Terraform resource type for CyberArk User",
    )
    cyberark_tf_sia_vm_policy_type: str = Field(
        default="idsec_sia_vm_policy",
        description="Terraform resource type for SIA VM policy",
    )
    cyberark_tf_sia_db_policy_type: str = Field(
        default="idsec_sia_db_policy",
        description="Terraform resource type for SIA DB policy",
    )

    # CyberArk tenant name (seeds CyberArkSettings in database on startup)
    cyberark_tenant_name: Optional[str] = Field(
        default=None, description="CyberArk tenant name for auto-discovery"
    )

    # SCIM integration (seeds CyberArkSettings in database on startup)
    cyberark_scim_enabled: bool = Field(
        default=False, description="Enable CyberArk SCIM user collection"
    )
    cyberark_scim_app_id: Optional[str] = Field(
        default=None, description="CyberArk Identity SCIM application ID"
    )
    cyberark_scim_scope: Optional[str] = Field(
        default=None, description="OAuth2 scope for SCIM token request"
    )
    cyberark_scim_client_id: Optional[str] = Field(
        default=None, description="SCIM OAuth2 client ID"
    )
    cyberark_scim_client_secret: Optional[str] = Field(
        default=None, description="SCIM OAuth2 client secret"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into a list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def auth_enabled(self) -> bool:
        """Check if any authentication method is configured."""
        return self.local_auth_enabled or self.oidc_enabled

    @property
    def oidc_enabled(self) -> bool:
        """Check if OIDC authentication is configured."""
        return bool(self.oidc_issuer and self.oidc_client_id)

    @property
    def cyberark_api_configured(self) -> bool:
        """Check if CyberArk API integration is fully configured."""
        return bool(
            self.cyberark_enabled
            and self.cyberark_base_url
            and self.cyberark_identity_url
            and self.cyberark_client_id
            and self.cyberark_client_secret
        )

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        """Validate security-sensitive settings."""
        # Warn about default session secret
        if self.session_secret == "change-me-in-production":
            if not self.debug:
                # In production mode, log a critical warning
                warnings.warn(
                    "SECURITY WARNING: Using default session_secret. "
                    "Set SESSION_SECRET environment variable to a secure random value.",
                    UserWarning,
                    stacklevel=2,
                )
                logger.warning(
                    "SECURITY WARNING: Using default session_secret in non-debug mode. "
                    "Set SESSION_SECRET environment variable to a secure random value."
                )
            else:
                logger.debug("Using default session_secret (acceptable in debug mode)")
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
