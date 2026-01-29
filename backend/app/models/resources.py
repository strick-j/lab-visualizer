"""
Database models for AWS resources.

Defines the SQLAlchemy ORM models for EC2 instances, RDS databases,
and related entities.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base


class SyncStatus(Base):
    """Tracks the last synchronization status for data sources."""

    __tablename__ = "sync_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resource_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Region(Base):
    """AWS Region."""

    __tablename__ = "regions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    ec2_instances: Mapped[list["EC2Instance"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    rds_instances: Mapped[list["RDSInstance"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )


class EC2Instance(Base):
    """EC2 Instance resource."""

    __tablename__ = "ec2_instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instance_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    instance_type: Mapped[str] = mapped_column(String(50), nullable=False)
    state: Mapped[str] = mapped_column(String(20), nullable=False)  # running, stopped, etc.

    # Network
    private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    public_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    subnet_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    availability_zone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Metadata
    launch_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

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
    region: Mapped["Region"] = relationship(back_populates="ec2_instances")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "running": "active",
            "stopped": "inactive",
            "pending": "transitioning",
            "stopping": "transitioning",
            "shutting-down": "transitioning",
            "terminated": "error",
        }
        return status_map.get(self.state, "unknown")


class RDSInstance(Base):
    """RDS Database Instance resource."""

    __tablename__ = "rds_instances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    db_instance_identifier: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    db_instance_class: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)  # available, stopped, etc.

    # Database details
    engine: Mapped[str] = mapped_column(String(30), nullable=False)
    engine_version: Mapped[str] = mapped_column(String(30), nullable=False)
    allocated_storage: Mapped[int] = mapped_column(Integer, nullable=False)

    # Network
    endpoint: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    availability_zone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    multi_az: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

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
    region: Mapped["Region"] = relationship(back_populates="rds_instances")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "available": "active",
            "stopped": "inactive",
            "starting": "transitioning",
            "stopping": "transitioning",
            "creating": "transitioning",
            "deleting": "transitioning",
            "failed": "error",
            "incompatible-restore": "error",
            "incompatible-parameters": "error",
        }
        return status_map.get(self.status, "unknown")
