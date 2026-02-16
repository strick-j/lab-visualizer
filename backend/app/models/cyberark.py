"""
Database models for CyberArk resources.

Defines SQLAlchemy ORM models for CyberArk Identity roles, Privilege Cloud
safes and accounts, and SIA access policies.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base


class CyberArkSafe(Base):
    """CyberArk Privilege Cloud Safe."""

    __tablename__ = "cyberark_safes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    safe_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    managing_cpm: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    number_of_members: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )
    number_of_accounts: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Deletion tracking
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    accounts: Mapped[list["CyberArkAccount"]] = relationship(
        back_populates="safe",
        cascade="all, delete-orphan",
        foreign_keys="[CyberArkAccount.safe_name]",
        primaryjoin="CyberArkSafe.safe_name == CyberArkAccount.safe_name",
    )
    members: Mapped[list["CyberArkSafeMember"]] = relationship(
        back_populates="safe",
        cascade="all, delete-orphan",
        foreign_keys="[CyberArkSafeMember.safe_name]",
        primaryjoin="CyberArkSafe.safe_name == CyberArkSafeMember.safe_name",
    )


class CyberArkAccount(Base):
    """CyberArk Privilege Cloud Account (credential stored in a safe)."""

    __tablename__ = "cyberark_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    account_name: Mapped[str] = mapped_column(String(255), nullable=False)
    safe_name: Mapped[str] = mapped_column(String(255), nullable=False)
    platform_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )  # Maps to target EC2/RDS
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    secret_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # password, key, etc.

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Deletion tracking
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    safe: Mapped[Optional["CyberArkSafe"]] = relationship(
        back_populates="accounts",
        foreign_keys=[safe_name],
        primaryjoin="CyberArkAccount.safe_name == CyberArkSafe.safe_name",
    )


class CyberArkSafeMember(Base):
    """Membership record linking a user, group, or role to a safe."""

    __tablename__ = "cyberark_safe_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    safe_name: Mapped[str] = mapped_column(String(255), nullable=False)
    member_name: Mapped[str] = mapped_column(String(255), nullable=False)
    member_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # user, group, role
    permission_level: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # read, use, manage, full

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    safe: Mapped[Optional["CyberArkSafe"]] = relationship(
        back_populates="members",
        foreign_keys=[safe_name],
        primaryjoin="CyberArkSafeMember.safe_name == CyberArkSafe.safe_name",
    )


class CyberArkRole(Base):
    """CyberArk Identity Role."""

    __tablename__ = "cyberark_roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Deletion tracking
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    members: Mapped[list["CyberArkRoleMember"]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
        foreign_keys="[CyberArkRoleMember.role_id]",
        primaryjoin="CyberArkRole.role_id == CyberArkRoleMember.role_id",
    )


class CyberArkRoleMember(Base):
    """Membership record linking a user or group to a CyberArk Identity role."""

    __tablename__ = "cyberark_role_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[str] = mapped_column(String(255), nullable=False)
    member_name: Mapped[str] = mapped_column(String(255), nullable=False)
    member_type: Mapped[str] = mapped_column(String(20), nullable=False)  # user, group

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    role: Mapped[Optional["CyberArkRole"]] = relationship(
        back_populates="members",
        foreign_keys=[role_id],
        primaryjoin="CyberArkRoleMember.role_id == CyberArkRole.role_id",
    )


class CyberArkSIAPolicy(Base):
    """CyberArk SIA (Secure Infrastructure Access) policy."""

    __tablename__ = "cyberark_sia_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    policy_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    policy_name: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # vm, database, cloud_console
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active"
    )  # active, inactive

    # Target matching criteria stored as JSON
    # Contains: vpc_ids, subnet_ids, tags, fqdn_patterns, ip_ranges, regions
    target_criteria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Deletion tracking
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    principals: Mapped[list["CyberArkSIAPolicyPrincipal"]] = relationship(
        back_populates="policy",
        cascade="all, delete-orphan",
        foreign_keys="[CyberArkSIAPolicyPrincipal.policy_id]",
        primaryjoin="CyberArkSIAPolicy.policy_id == CyberArkSIAPolicyPrincipal.policy_id",
    )


class CyberArkSIAPolicyPrincipal(Base):
    """Principal (user or role) assigned to an SIA policy."""

    __tablename__ = "cyberark_sia_policy_principals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    policy_id: Mapped[str] = mapped_column(String(255), nullable=False)
    principal_name: Mapped[str] = mapped_column(String(255), nullable=False)
    principal_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # user, role

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    policy: Mapped[Optional["CyberArkSIAPolicy"]] = relationship(
        back_populates="principals",
        foreign_keys=[policy_id],
        primaryjoin=(
            "CyberArkSIAPolicyPrincipal.policy_id == CyberArkSIAPolicy.policy_id"
        ),
    )


class CyberArkUser(Base):
    """CyberArk Identity User (collected via SCIM)."""

    __tablename__ = "cyberark_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    user_name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Deletion tracking
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class CyberArkSettings(Base):
    """Singleton model for storing CyberArk integration configuration."""

    __tablename__ = "cyberark_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Tenant discovery (auto-populates base_url and identity_url)
    tenant_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Connection settings (platform token)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    identity_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    uap_base_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    client_secret: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # SCIM integration settings (separate OAuth2 credentials)
    scim_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    scim_app_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scim_oauth2_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    scim_scope: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    scim_client_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    scim_client_secret: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
    updated_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
