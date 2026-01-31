// =============================================================================
// Resource Types
// =============================================================================

export type DisplayStatus =
  | "active"
  | "inactive"
  | "transitioning"
  | "error"
  | "unknown";

export interface EC2Instance {
  id: number;
  instance_id: string;
  name: string | null;
  instance_type: string;
  state: string;
  display_status: DisplayStatus;
  private_ip: string | null;
  public_ip: string | null;
  vpc_id: string | null;
  subnet_id: string | null;
  availability_zone: string | null;
  launch_time: string | null;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export interface RDSInstance {
  id: number;
  db_instance_identifier: string;
  name: string | null;
  db_instance_class: string;
  status: string;
  display_status: DisplayStatus;
  engine: string;
  engine_version: string;
  allocated_storage: number;
  endpoint: string | null;
  port: number | null;
  vpc_id: string | null;
  availability_zone: string | null;
  multi_az: boolean;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export interface VPC {
  id: number;
  vpc_id: string;
  name: string | null;
  cidr_block: string;
  state: string;
  is_default: boolean;
  display_status: DisplayStatus;
  enable_dns_support: boolean;
  enable_dns_hostnames: boolean;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export type SubnetType = "public" | "private" | "unknown";

export interface Subnet {
  id: number;
  subnet_id: string;
  name: string | null;
  vpc_id: string;
  cidr_block: string;
  availability_zone: string;
  subnet_type: SubnetType;
  state: string;
  display_status: DisplayStatus;
  available_ip_count: number;
  map_public_ip_on_launch: boolean;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export interface InternetGateway {
  id: number;
  igw_id: string;
  name: string | null;
  vpc_id: string | null;
  state: string;
  display_status: DisplayStatus;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export type ConnectivityType = "public" | "private";

export interface NATGateway {
  id: number;
  nat_gateway_id: string;
  name: string | null;
  vpc_id: string;
  subnet_id: string;
  state: string;
  connectivity_type: ConnectivityType;
  display_status: DisplayStatus;
  primary_private_ip: string | null;
  primary_public_ip: string | null;
  allocation_id: string | null;
  network_interface_id: string | null;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export interface ElasticIP {
  id: number;
  allocation_id: string;
  name: string | null;
  public_ip: string;
  private_ip: string | null;
  domain: string;
  display_status: DisplayStatus;
  association_id: string | null;
  instance_id: string | null;
  network_interface_id: string | null;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface MetaInfo {
  total: number;
  last_refreshed: string | null;
}

export interface ListResponse<T> {
  data: T[];
  meta: MetaInfo;
}

export interface ResourceCount {
  active: number;
  inactive: number;
  transitioning: number;
  error: number;
  total: number;
}

export interface StatusSummary {
  ec2: ResourceCount;
  rds: ResourceCount;
  total: ResourceCount;
  last_refreshed: string | null;
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  resources_updated: number;
  duration_seconds: number;
}

// =============================================================================
// Terraform Types
// =============================================================================

export interface TerraformStateInfo {
  name: string;
  key: string;
  description: string | null;
  last_modified: string | null;
  resource_count: number;
  status: string;
}

export interface TerraformStatesResponse {
  states: TerraformStateInfo[];
  total_tf_managed_resources: number;
}

export interface DriftItem {
  resource_type: string;
  resource_id: string;
  drift_type: "unmanaged" | "orphaned" | "modified";
  details: string | null;
}

export interface DriftResponse {
  drift_detected: boolean;
  items: DriftItem[];
  checked_at: string;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface ResourceFilters {
  status?: DisplayStatus;
  region?: string;
  search?: string;
  tf_managed?: boolean;
  vpc_id?: string;
  subnet_id?: string;
  subnet_type?: SubnetType;
  connectivity_type?: ConnectivityType;
  instance_id?: string;
  associated?: boolean;
}

// =============================================================================
// VPC Page Types
// =============================================================================

export type VPCResourceType =
  | "vpcs"
  | "subnets"
  | "internet-gateways"
  | "nat-gateways"
  | "elastic-ips";
