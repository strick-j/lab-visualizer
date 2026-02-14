// =============================================================================
// Application Info
// =============================================================================

export interface AppInfo {
  version: string;
  build_sha: string;
  build_date: string;
  environment: string;
  timestamp: string;
}

// =============================================================================
// Resource Types
// =============================================================================

export type DisplayStatus =
  | "active"
  | "inactive"
  | "transitioning"
  | "error"
  | "unknown";

export type ManagedBy = "terraform" | "github_actions" | "unmanaged";

export interface EC2Instance {
  id: number;
  instance_id: string;
  name: string | null;
  instance_type: string;
  state: string;
  display_status: DisplayStatus;
  private_ip: string | null;
  public_ip: string | null;
  private_dns: string | null;
  public_dns: string | null;
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

export type ECSLaunchType = "FARGATE" | "EC2" | "EXTERNAL";

export interface ECSContainer {
  id: number;
  task_id: string;
  name: string | null;
  cluster_name: string;
  launch_type: ECSLaunchType;
  status: string;
  display_status: DisplayStatus;
  cpu: number;
  memory: number;
  task_definition_arn: string | null;
  desired_status: string | null;
  image: string | null;
  image_tag: string | null;
  container_port: number | null;
  private_ip: string | null;
  subnet_id: string | null;
  vpc_id: string | null;
  availability_zone: string | null;
  started_at: string | null;
  tags: Record<string, string> | null;
  tf_managed: boolean;
  tf_state_source: string | null;
  tf_resource_address: string | null;
  managed_by: ManagedBy;
  region_name: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  updated_at: string;
  created_at?: string;
}

export interface ECSClusterSummary {
  cluster_name: string;
  total_tasks: number;
  running_tasks: number;
  stopped_tasks: number;
  pending_tasks: number;
  tf_managed: boolean;
  managed_by: ManagedBy;
  region_name: string | null;
  containers: ECSContainer[];
}

export interface ECSSummaryResponse {
  clusters: number;
  services: number;
  running_tasks: number;
  stopped_tasks: number;
  pending_tasks: number;
  total_tasks: number;
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

export interface TerraformBucketInfo {
  name: string;
  region: string | null;
}

export interface TerraformStateInfo {
  name: string;
  key: string;
  bucket: TerraformBucketInfo | null;
  description: string | null;
  last_modified: string | null;
  resource_count: number;
  status: string;
  all_resource_types?: Record<string, number> | null;
  skipped_resource_count?: number;
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
  cluster_name?: string;
  launch_type?: ECSLaunchType;
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
