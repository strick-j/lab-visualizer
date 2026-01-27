// =============================================================================
// Resource Types
// =============================================================================

export type DisplayStatus = 'active' | 'inactive' | 'transitioning' | 'error' | 'unknown';

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
  drift_type: 'unmanaged' | 'orphaned' | 'modified';
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
}
