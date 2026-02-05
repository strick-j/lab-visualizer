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
    admin_username: Optional[str] = Field(
        default=None, description="Initial admin username (created on first startup)"
    )
    admin_password: Optional[str] = Field(
        default=None, description="Initial admin password (created on first startup)"
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
