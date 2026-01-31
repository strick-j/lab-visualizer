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
# VPC Schemas
# =============================================================================


class VPCBase(BaseSchema):
    """Base VPC schema."""

    vpc_id: str
    name: Optional[str] = None
    cidr_block: str
    state: str
    is_default: bool = False


class VPCResponse(VPCBase):
    """VPC response schema."""

    id: int
    display_status: DisplayStatus
    enable_dns_support: bool = True
    enable_dns_hostnames: bool = False
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class VPCDetail(VPCResponse):
    """Detailed VPC response with all fields."""

    created_at: datetime


# =============================================================================
# Subnet Schemas
# =============================================================================


class SubnetBase(BaseSchema):
    """Base Subnet schema."""

    subnet_id: str
    name: Optional[str] = None
    vpc_id: str
    cidr_block: str
    availability_zone: str
    subnet_type: str  # public, private, unknown
    state: str


class SubnetResponse(SubnetBase):
    """Subnet response schema."""

    id: int
    display_status: DisplayStatus
    available_ip_count: int = 0
    map_public_ip_on_launch: bool = False
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class SubnetDetail(SubnetResponse):
    """Detailed Subnet response with all fields."""

    created_at: datetime


# =============================================================================
# Internet Gateway Schemas
# =============================================================================


class InternetGatewayBase(BaseSchema):
    """Base Internet Gateway schema."""

    igw_id: str
    name: Optional[str] = None
    vpc_id: Optional[str] = None  # Null when detached
    state: str


class InternetGatewayResponse(InternetGatewayBase):
    """Internet Gateway response schema."""

    id: int
    display_status: DisplayStatus
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class InternetGatewayDetail(InternetGatewayResponse):
    """Detailed Internet Gateway response with all fields."""

    created_at: datetime


# =============================================================================
# NAT Gateway Schemas
# =============================================================================


class NATGatewayBase(BaseSchema):
    """Base NAT Gateway schema."""

    nat_gateway_id: str
    name: Optional[str] = None
    vpc_id: str
    subnet_id: str
    state: str
    connectivity_type: str  # public, private


class NATGatewayResponse(NATGatewayBase):
    """NAT Gateway response schema."""

    id: int
    display_status: DisplayStatus
    primary_private_ip: Optional[str] = None
    primary_public_ip: Optional[str] = None
    allocation_id: Optional[str] = None
    network_interface_id: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class NATGatewayDetail(NATGatewayResponse):
    """Detailed NAT Gateway response with all fields."""

    created_at: datetime


# =============================================================================
# Elastic IP Schemas
# =============================================================================


class ElasticIPBase(BaseSchema):
    """Base Elastic IP schema."""

    allocation_id: str
    name: Optional[str] = None
    public_ip: str
    private_ip: Optional[str] = None
    domain: str  # vpc, standard


class ElasticIPResponse(ElasticIPBase):
    """Elastic IP response schema."""

    id: int
    display_status: DisplayStatus
    association_id: Optional[str] = None
    instance_id: Optional[str] = None
    network_interface_id: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    tf_managed: bool = False
    tf_state_source: Optional[str] = None
    tf_resource_address: Optional[str] = None
    region_name: Optional[str] = Field(None, description="AWS region name")
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    updated_at: datetime


class ElasticIPDetail(ElasticIPResponse):
    """Detailed Elastic IP response with all fields."""

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


# =============================================================================
# Topology Visualization Schemas
# =============================================================================


class TopologyEC2Instance(BaseSchema):
    """EC2 instance for topology visualization."""

    id: str
    name: Optional[str] = None
    instance_type: str
    state: str
    display_status: DisplayStatus
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    private_dns: Optional[str] = None
    public_dns: Optional[str] = None
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None


class TopologyRDSInstance(BaseSchema):
    """RDS instance for topology visualization."""

    id: str
    name: Optional[str] = None
    engine: str
    instance_class: str
    status: str
    display_status: DisplayStatus
    endpoint: Optional[str] = None
    port: Optional[int] = None
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None


class TopologyNATGateway(BaseSchema):
    """NAT Gateway for topology visualization."""

    id: str
    name: Optional[str] = None
    state: str
    display_status: DisplayStatus
    primary_public_ip: Optional[str] = None
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None


class TopologyInternetGateway(BaseSchema):
    """Internet Gateway for topology visualization."""

    id: str
    name: Optional[str] = None
    state: str
    display_status: DisplayStatus
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None


class TopologyElasticIP(BaseSchema):
    """Elastic IP for topology visualization."""

    id: str
    public_ip: str
    associated_with: Optional[str] = None
    association_type: Optional[str] = None  # 'ec2', 'nat_gateway', 'eni'
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None


class TopologySubnet(BaseSchema):
    """Subnet with contained resources for topology visualization."""

    id: str
    name: Optional[str] = None
    cidr_block: str
    availability_zone: str
    subnet_type: str  # public, private, unknown
    display_status: DisplayStatus
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None
    nat_gateway: Optional[TopologyNATGateway] = None
    ec2_instances: List[TopologyEC2Instance] = []
    rds_instances: List[TopologyRDSInstance] = []


class TopologyVPC(BaseSchema):
    """VPC with all nested resources for topology visualization."""

    id: str
    name: Optional[str] = None
    cidr_block: str
    state: str
    display_status: DisplayStatus
    tf_managed: bool = True
    tf_resource_address: Optional[str] = None
    internet_gateway: Optional[TopologyInternetGateway] = None
    subnets: List[TopologySubnet] = []
    elastic_ips: List[TopologyElasticIP] = []


class TopologyMeta(BaseSchema):
    """Metadata for topology response."""

    total_vpcs: int = 0
    total_subnets: int = 0
    total_ec2: int = 0
    total_rds: int = 0
    total_nat_gateways: int = 0
    total_internet_gateways: int = 0
    total_elastic_ips: int = 0
    last_refreshed: Optional[datetime] = None


class TopologyResponse(BaseSchema):
    """Complete topology response for visualization."""

    vpcs: List[TopologyVPC]
    meta: TopologyMeta
