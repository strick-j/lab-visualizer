"""
Pydantic schemas for API request/response validation.

These schemas define the shape of data exchanged through the API.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field


# =============================================================================
# Enums
# =============================================================================


class DisplayStatus(str, Enum):
    """Normalized display status for all resources."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    TRANSITIONING = "transitioning"
    ERROR = "error"
    UNKNOWN = "unknown"


class EC2State(str, Enum):
    """EC2 instance states."""

    RUNNING = "running"
    STOPPED = "stopped"
    PENDING = "pending"
    STOPPING = "stopping"
    SHUTTING_DOWN = "shutting-down"
    TERMINATED = "terminated"


class RDSStatus(str, Enum):
    """RDS instance statuses."""

    AVAILABLE = "available"
    STOPPED = "stopped"
    STARTING = "starting"
    STOPPING = "stopping"
    CREATING = "creating"
    DELETING = "deleting"
    FAILED = "failed"


# =============================================================================
# Base Schemas
# =============================================================================


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=True)


# =============================================================================
# EC2 Schemas
# =============================================================================


class EC2InstanceBase(BaseSchema):
    """Base EC2 instance schema."""

    instance_id: str
    name: Optional[str] = None
    instance_type: str
    state: str
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    vpc_id: Optional[str] = None
    subnet_id: Optional[str] = None
    availability_zone: Optional[str] = None


class EC2InstanceResponse(EC2InstanceBase):
    """EC2 instance response schema."""

    id: int
    display_status: DisplayStatus
    launch_time: Optional[datetime] = None
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class EC2InstanceDetail(EC2InstanceResponse):
    """Detailed EC2 instance response with all fields."""

    created_at: datetime


# =============================================================================
# RDS Schemas
# =============================================================================


class RDSInstanceBase(BaseSchema):
    """Base RDS instance schema."""

    db_instance_identifier: str
    name: Optional[str] = None
    db_instance_class: str
    status: str
    engine: str
    engine_version: str
    allocated_storage: int


class RDSInstanceResponse(RDSInstanceBase):
    """RDS instance response schema."""

    id: int
    display_status: DisplayStatus
    endpoint: Optional[str] = None
    port: Optional[int] = None
    vpc_id: Optional[str] = None
    availability_zone: Optional[str] = None
    multi_az: bool = False
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class RDSInstanceDetail(RDSInstanceResponse):
    """Detailed RDS instance response with all fields."""

    created_at: datetime


# =============================================================================
# Terraform Schemas
# =============================================================================


class TerraformStateInfo(BaseSchema):
    """Information about a Terraform state file."""

    name: str
    key: str
    description: Optional[str] = None
    last_modified: Optional[datetime] = None
    resource_count: int = 0
    status: str = "unknown"


class TerraformStatesResponse(BaseSchema):
    """Response for Terraform states endpoint."""

    states: List[TerraformStateInfo]
    total_tf_managed_resources: int


class DriftItem(BaseSchema):
    """A single drift detection item."""

    resource_type: str
    resource_id: str
    drift_type: str  # "unmanaged", "orphaned", "modified"
    details: Optional[str] = None


class DriftResponse(BaseSchema):
    """Response for drift detection endpoint."""

    drift_detected: bool
    items: List[DriftItem]
    checked_at: datetime


# =============================================================================
# Status Summary Schemas
# =============================================================================


class ResourceCount(BaseSchema):
    """Count of resources by status."""

    active: int = 0
    inactive: int = 0
    transitioning: int = 0
    error: int = 0
    total: int = 0


class StatusSummary(BaseSchema):
    """Summary of all resource statuses."""

    ec2: ResourceCount
    rds: ResourceCount
    total: ResourceCount
    last_refreshed: Optional[datetime] = None


# =============================================================================
# Generic Response Schemas
# =============================================================================

T = TypeVar("T")


class PaginatedResponse(BaseSchema, Generic[T]):
    """Generic paginated response wrapper."""

    data: List[T]
    total: int
    page: int = 1
    page_size: int = 50
    has_more: bool = False


class MetaInfo(BaseSchema):
    """Metadata for API responses."""

    total: int
    last_refreshed: Optional[datetime] = None


class ListResponse(BaseSchema, Generic[T]):
    """Generic list response wrapper."""

    data: List[T]
    meta: MetaInfo


# =============================================================================
# Request Schemas
# =============================================================================


class RefreshRequest(BaseSchema):
    """Request to trigger a data refresh."""

    force: bool = Field(
        default=False, description="Force refresh even if recently synced"
    )


class RefreshResponse(BaseSchema):
    """Response from a refresh operation."""

    success: bool
    message: str
    resources_updated: int = 0
    duration_seconds: float = 0.0
