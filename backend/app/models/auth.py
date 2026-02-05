"""
Database models for authentication.

Defines the SQLAlchemy ORM models for users and sessions.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.database import Base


class User(Base):
    """User model for local and federated authentication."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identity
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )

    # Local auth (password hash, only for local users)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Federated auth (OIDC)
    auth_provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default="local"
    )  # local, oidc
    external_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )  # Subject ID from IdP

    # Profile
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)

    # Timestamps
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Session(Base):
    """Session model for tracking user sessions."""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Session identification
    session_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # Token management
    access_token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    refresh_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Session metadata
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Expiration
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    refresh_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Status
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class AuthSettings(Base):
    """Singleton model for storing authentication configuration."""

    __tablename__ = "auth_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # OIDC Settings
    oidc_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    oidc_issuer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    oidc_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    oidc_client_secret: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    oidc_display_name: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, default="OIDC"
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
