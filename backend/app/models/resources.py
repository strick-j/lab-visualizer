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


class TerraformStateBucket(Base):
    """Configuration for an S3 bucket containing Terraform state files."""

    __tablename__ = "terraform_state_buckets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_name: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    prefix: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    excluded_paths: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # Comma-separated glob patterns to exclude during auto-discovery
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    source: Mapped[str] = mapped_column(
        String(20), nullable=False, default="manual"
    )  # "manual" or "env"

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    paths: Mapped[list["TerraformStatePath"]] = relationship(
        back_populates="bucket", cascade="all, delete-orphan"
    )


class TerraformStatePath(Base):
    """An explicit state file path within an S3 bucket."""

    __tablename__ = "terraform_state_paths"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("terraform_state_buckets.id"), nullable=False
    )
    path: Mapped[str] = mapped_column(String(1000), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    bucket: Mapped["TerraformStateBucket"] = relationship(back_populates="paths")


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
    vpcs: Mapped[list["VPC"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    subnets: Mapped[list["Subnet"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    internet_gateways: Mapped[list["InternetGateway"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    nat_gateways: Mapped[list["NATGateway"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    elastic_ips: Mapped[list["ElasticIP"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    s3_buckets: Mapped[list["S3Bucket"]] = relationship(
        back_populates="region", cascade="all, delete-orphan"
    )
    ecs_containers: Mapped[list["ECSContainer"]] = relationship(
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
    state: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # running, stopped, etc.

    # Network
    private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    public_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    private_dns: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    public_dns: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    subnet_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    availability_zone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Platform (AWS returns "windows" for Windows instances; absent for Linux)
    platform: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Owner account (Reservation.OwnerId from DescribeInstances)
    owner_account_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Metadata
    launch_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # available, stopped, etc.

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

    # Owner account (extracted from DBInstanceArn)
    owner_account_id: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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


class VPC(Base):
    """VPC (Virtual Private Cloud) resource."""

    __tablename__ = "vpcs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vpc_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cidr_block: Mapped[str] = mapped_column(String(20), nullable=False)
    state: Mapped[str] = mapped_column(String(20), nullable=False)  # available, pending
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    # DNS settings
    enable_dns_support: Mapped[bool] = mapped_column(Boolean, default=True)
    enable_dns_hostnames: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="vpcs")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "available": "active",
            "pending": "transitioning",
        }
        return status_map.get(self.state, "unknown")


class Subnet(Base):
    """Subnet resource."""

    __tablename__ = "subnets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subnet_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vpc_id: Mapped[str] = mapped_column(String(30), nullable=False)
    cidr_block: Mapped[str] = mapped_column(String(20), nullable=False)
    availability_zone: Mapped[str] = mapped_column(String(20), nullable=False)

    # Classification
    subnet_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # public, private, unknown

    # Configuration
    state: Mapped[str] = mapped_column(String(20), nullable=False)  # available, pending
    available_ip_count: Mapped[int] = mapped_column(Integer, nullable=False)
    map_public_ip_on_launch: Mapped[bool] = mapped_column(Boolean, default=False)

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="subnets")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "available": "active",
            "pending": "transitioning",
        }
        return status_map.get(self.state, "unknown")


class InternetGateway(Base):
    """Internet Gateway resource."""

    __tablename__ = "internet_gateways"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    igw_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # Nullable when detached
    state: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # available, attached, detaching, detached

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="internet_gateways")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "available": "active",
            "attached": "active",
            "detaching": "transitioning",
            "detached": "inactive",
        }
        return status_map.get(self.state, "unknown")


class NATGateway(Base):
    """NAT Gateway resource."""

    __tablename__ = "nat_gateways"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nat_gateway_id: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vpc_id: Mapped[str] = mapped_column(String(30), nullable=False)
    subnet_id: Mapped[str] = mapped_column(String(30), nullable=False)
    state: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # pending, available, deleting, deleted, failed

    # Configuration
    connectivity_type: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # public, private
    primary_private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    primary_public_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Associations
    allocation_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )  # EIP allocation
    network_interface_id: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="nat_gateways")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "available": "active",
            "pending": "transitioning",
            "deleting": "transitioning",
            "deleted": "inactive",
            "failed": "error",
        }
        return status_map.get(self.state, "unknown")


class ElasticIP(Base):
    """Elastic IP address resource."""

    __tablename__ = "elastic_ips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    allocation_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    public_ip: Mapped[str] = mapped_column(String(45), nullable=False)
    private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Associations
    association_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    instance_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    network_interface_id: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )

    # Configuration
    domain: Mapped[str] = mapped_column(String(10), nullable=False)  # vpc, standard

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="elastic_ips")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        # EIPs don't have states, determine based on association
        if self.association_id:
            return "active"
        return "inactive"


class S3Bucket(Base):
    """S3 Bucket resource."""

    __tablename__ = "s3_buckets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bucket_name: Mapped[str] = mapped_column(String(63), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    creation_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Versioning
    versioning_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_delete: Mapped[bool] = mapped_column(Boolean, default=False)

    # Encryption
    encryption_algorithm: Mapped[Optional[str]] = mapped_column(
        String(30), nullable=True
    )  # AES256, aws:kms
    kms_key_id: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    bucket_key_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    # Public access block
    block_public_acls: Mapped[bool] = mapped_column(Boolean, default=False)
    block_public_policy: Mapped[bool] = mapped_column(Boolean, default=False)
    ignore_public_acls: Mapped[bool] = mapped_column(Boolean, default=False)
    restrict_public_buckets: Mapped[bool] = mapped_column(Boolean, default=False)

    # Bucket policy (stored as JSON string)
    policy: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Metadata
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

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
    region: Mapped["Region"] = relationship(back_populates="s3_buckets")

    @property
    def display_status(self) -> str:
        """Get normalized display status.

        S3 buckets are always 'active' if they exist.
        """
        return "active"


class ECSContainer(Base):
    """ECS Container (Task) resource."""

    __tablename__ = "ecs_containers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    region_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("regions.id"), nullable=False
    )

    # Basic info
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cluster_name: Mapped[str] = mapped_column(String(255), nullable=False)
    task_definition_arn: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    launch_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # FARGATE, EC2, EXTERNAL
    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # RUNNING, STOPPED, PENDING, etc.
    desired_status: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    # Resources
    cpu: Mapped[int] = mapped_column(Integer, default=0)
    memory: Mapped[int] = mapped_column(Integer, default=0)

    # Container details
    image: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    image_tag: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    container_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Network
    private_ip: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    subnet_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    vpc_id: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    availability_zone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Metadata
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    tags: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON string

    # Terraform tracking
    tf_managed: Mapped[bool] = mapped_column(Boolean, default=False)
    tf_state_source: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    tf_resource_address: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )

    # Management source tracking (terraform, github_actions, unmanaged)
    managed_by: Mapped[str] = mapped_column(
        String(30), nullable=False, default="unmanaged"
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
    region: Mapped["Region"] = relationship(back_populates="ecs_containers")

    @property
    def display_status(self) -> str:
        """Get normalized display status."""
        status_map = {
            "RUNNING": "active",
            "STOPPED": "inactive",
            "PROVISIONING": "transitioning",
            "PENDING": "transitioning",
            "ACTIVATING": "transitioning",
            "DEPROVISIONING": "transitioning",
            "STOPPING": "transitioning",
            "DEACTIVATING": "transitioning",
            "DELETED": "error",
        }
        return status_map.get(self.status, "unknown")
