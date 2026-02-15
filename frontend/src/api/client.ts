import axios from "axios";
import type {
  ListResponse,
  AppInfo,
  EC2Instance,
  RDSInstance,
  ECSContainer,
  ECSClusterSummary,
  VPC,
  Subnet,
  InternetGateway,
  NATGateway,
  ElasticIP,
  S3Bucket,
  StatusSummary,
  RefreshResponse,
  TerraformStatesResponse,
  DriftResponse,
  ResourceFilters,
  AuthConfig,
  LoginCredentials,
  TokenResponse,
  User,
  UserListResponse,
  UserStatusUpdate,
  UserRoleUpdate,
  OIDCLoginResponse,
  AuthSettingsResponse,
  OIDCSettings,
  OIDCSettingsUpdate,
  TestConnectionResponse,
  PasswordChangeRequest,
  AdminSetupRequest,
  SetupStatusResponse,
  TerraformBucket,
  TerraformBucketsListResponse,
  TerraformBucketCreate,
  TerraformBucketUpdate,
  TerraformPath,
  TerraformPathCreate,
  TerraformPathUpdate,
  S3BucketTestResponse,
  S3BucketListResponse,
} from "@/types";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for authentication (if needed)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stored tokens on 401
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");

      // Only redirect if not already on login page or auth routes
      const currentPath = window.location.pathname;
      if (
        !currentPath.startsWith("/login") &&
        !currentPath.startsWith("/auth")
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// =============================================================================
// Health & Status
// =============================================================================

export async function getHealthStatus(): Promise<{
  status: string;
  timestamp: string;
}> {
  const response = await api.get("/health");
  return response.data;
}

export async function getStatusSummary(): Promise<StatusSummary> {
  const response = await api.get("/status/summary");
  return response.data;
}

export async function getAppInfo(): Promise<AppInfo> {
  const response = await api.get("/info");
  return response.data;
}

// =============================================================================
// EC2 Instances
// =============================================================================

export async function getEC2Instances(
  filters?: ResourceFilters,
): Promise<ListResponse<EC2Instance>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/ec2", { params });
  return response.data;
}

export async function getEC2Instance(instanceId: string): Promise<EC2Instance> {
  const response = await api.get(`/ec2/${instanceId}`);
  return response.data;
}

// =============================================================================
// RDS Instances
// =============================================================================

export async function getRDSInstances(
  filters?: ResourceFilters,
): Promise<ListResponse<RDSInstance>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/rds", { params });
  return response.data;
}

export async function getRDSInstance(
  dbIdentifier: string,
): Promise<RDSInstance> {
  const response = await api.get(`/rds/${dbIdentifier}`);
  return response.data;
}

// =============================================================================
// ECS Containers
// =============================================================================

export async function getECSContainers(
  filters?: ResourceFilters,
): Promise<ListResponse<ECSContainer>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.cluster_name)
    params.append("cluster_name", filters.cluster_name);
  if (filters?.launch_type) params.append("launch_type", filters.launch_type);

  const response = await api.get("/ecs", { params });
  return response.data;
}

export async function getECSContainer(taskId: string): Promise<ECSContainer> {
  const response = await api.get(`/ecs/${taskId}`);
  return response.data;
}

export async function getECSClusters(filters?: {
  region?: string;
  search?: string;
  tf_managed?: boolean;
}): Promise<ListResponse<ECSClusterSummary>> {
  const params = new URLSearchParams();
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/ecs/clusters", { params });
  return response.data;
}

import type { ECSSummaryResponse } from "@/types";

export async function getECSSummary(): Promise<ECSSummaryResponse> {
  const response = await api.get("/ecs/summary");
  return response.data;
}

// =============================================================================
// VPCs
// =============================================================================

export async function getVPCs(
  filters?: ResourceFilters,
): Promise<ListResponse<VPC>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/vpcs", { params });
  return response.data;
}

export async function getVPC(vpcId: string): Promise<VPC> {
  const response = await api.get(`/vpcs/${vpcId}`);
  return response.data;
}

// =============================================================================
// Subnets
// =============================================================================

export async function getSubnets(
  filters?: ResourceFilters,
): Promise<ListResponse<Subnet>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.vpc_id) params.append("vpc_id", filters.vpc_id);
  if (filters?.subnet_type) params.append("subnet_type", filters.subnet_type);

  const response = await api.get("/subnets", { params });
  return response.data;
}

export async function getSubnet(subnetId: string): Promise<Subnet> {
  const response = await api.get(`/subnets/${subnetId}`);
  return response.data;
}

// =============================================================================
// Internet Gateways
// =============================================================================

export async function getInternetGateways(
  filters?: ResourceFilters,
): Promise<ListResponse<InternetGateway>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.vpc_id) params.append("vpc_id", filters.vpc_id);

  const response = await api.get("/internet-gateways", { params });
  return response.data;
}

export async function getInternetGateway(
  igwId: string,
): Promise<InternetGateway> {
  const response = await api.get(`/internet-gateways/${igwId}`);
  return response.data;
}

// =============================================================================
// NAT Gateways
// =============================================================================

export async function getNATGateways(
  filters?: ResourceFilters,
): Promise<ListResponse<NATGateway>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.vpc_id) params.append("vpc_id", filters.vpc_id);
  if (filters?.subnet_id) params.append("subnet_id", filters.subnet_id);
  if (filters?.connectivity_type)
    params.append("connectivity_type", filters.connectivity_type);

  const response = await api.get("/nat-gateways", { params });
  return response.data;
}

export async function getNATGateway(natGatewayId: string): Promise<NATGateway> {
  const response = await api.get(`/nat-gateways/${natGatewayId}`);
  return response.data;
}

// =============================================================================
// Elastic IPs
// =============================================================================

export async function getElasticIPs(
  filters?: ResourceFilters,
): Promise<ListResponse<ElasticIP>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.instance_id) params.append("instance_id", filters.instance_id);
  if (filters?.associated !== undefined)
    params.append("associated", String(filters.associated));

  const response = await api.get("/elastic-ips", { params });
  return response.data;
}

export async function getElasticIP(allocationId: string): Promise<ElasticIP> {
  const response = await api.get(`/elastic-ips/${allocationId}`);
  return response.data;
}

// =============================================================================
// S3 Buckets
// =============================================================================

export async function getS3Buckets(
  filters?: ResourceFilters,
): Promise<ListResponse<S3Bucket>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.region) params.append("region", filters.region);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/s3-buckets", { params });
  return response.data;
}

export async function getS3Bucket(bucketName: string): Promise<S3Bucket> {
  const response = await api.get(
    `/s3-buckets/${encodeURIComponent(bucketName)}`,
  );
  return response.data;
}

// =============================================================================
// Refresh
// =============================================================================

export async function refreshData(force = false): Promise<RefreshResponse> {
  const response = await api.post("/refresh", { force });
  return response.data;
}

// =============================================================================
// Terraform
// =============================================================================

export async function getTerraformStates(): Promise<TerraformStatesResponse> {
  const response = await api.get("/terraform/states");
  return response.data;
}

export async function getDrift(): Promise<DriftResponse> {
  const response = await api.get("/terraform/drift");
  return response.data;
}

// =============================================================================
// Topology
// =============================================================================

import type { TopologyResponse } from "@/types/topology";

export async function getTopology(filters?: {
  vpc_id?: string;
}): Promise<TopologyResponse> {
  const params = new URLSearchParams();
  if (filters?.vpc_id) params.append("vpc_id", filters.vpc_id);

  const response = await api.get("/topology", { params });
  return response.data;
}

// =============================================================================
// Authentication
// =============================================================================

export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await api.get("/auth/config");
  return response.data;
}

export async function login(
  credentials: LoginCredentials,
): Promise<TokenResponse> {
  const response = await api.post("/auth/login", credentials);
  return response.data;
}

export async function refreshToken(
  refreshTokenValue: string,
): Promise<TokenResponse> {
  const response = await api.post("/auth/refresh", {
    refresh_token: refreshTokenValue,
  });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get("/auth/me");
  return response.data;
}

export async function initiateOIDCLogin(): Promise<OIDCLoginResponse> {
  const response = await api.get("/auth/oidc/login");
  return response.data;
}

export async function getSetupStatus(): Promise<SetupStatusResponse> {
  const response = await api.get("/auth/setup-status");
  return response.data;
}

export async function setupAdmin(
  data: AdminSetupRequest,
): Promise<TokenResponse> {
  const response = await api.post("/auth/setup", data);
  return response.data;
}

// =============================================================================
// User Management
// =============================================================================

export async function changeUserPassword(
  userId: number,
  data: PasswordChangeRequest,
): Promise<User> {
  const response = await api.put(`/users/${userId}/password`, data);
  return response.data;
}

export async function getUsers(): Promise<UserListResponse> {
  const response = await api.get("/users");
  return response.data;
}

export async function updateUserStatus(
  userId: number,
  data: UserStatusUpdate,
): Promise<User> {
  const response = await api.patch(`/users/${userId}/status`, data);
  return response.data;
}

export async function updateUserRole(
  userId: number,
  data: UserRoleUpdate,
): Promise<User> {
  const response = await api.patch(`/users/${userId}/role`, data);
  return response.data;
}

// =============================================================================
// Settings (Admin only)
// =============================================================================

export async function getAuthSettings(): Promise<AuthSettingsResponse> {
  const response = await api.get("/settings");
  return response.data;
}

export async function getOIDCSettings(): Promise<OIDCSettings> {
  const response = await api.get("/settings/oidc");
  return response.data;
}

export async function updateOIDCSettings(
  settings: OIDCSettingsUpdate,
): Promise<OIDCSettings> {
  const response = await api.put("/settings/oidc", settings);
  return response.data;
}

export async function testOIDCConnection(
  issuer: string,
): Promise<TestConnectionResponse> {
  const response = await api.post("/settings/oidc/test", { issuer });
  return response.data;
}

// =============================================================================
// Terraform State Buckets (Admin only)
// =============================================================================

export async function getTerraformBuckets(): Promise<TerraformBucketsListResponse> {
  const response = await api.get("/settings/terraform/buckets");
  return response.data;
}

export async function createTerraformBucket(
  data: TerraformBucketCreate,
): Promise<TerraformBucket> {
  const response = await api.post("/settings/terraform/buckets", data);
  return response.data;
}

export async function updateTerraformBucket(
  id: number,
  data: TerraformBucketUpdate,
): Promise<TerraformBucket> {
  const response = await api.put(`/settings/terraform/buckets/${id}`, data);
  return response.data;
}

export async function deleteTerraformBucket(id: number): Promise<void> {
  await api.delete(`/settings/terraform/buckets/${id}`);
}

// =============================================================================
// Terraform State Paths (Admin only)
// =============================================================================

export async function createTerraformPath(
  bucketId: number,
  data: TerraformPathCreate,
): Promise<TerraformPath> {
  const response = await api.post(
    `/settings/terraform/buckets/${bucketId}/paths`,
    data,
  );
  return response.data;
}

export async function updateTerraformPath(
  pathId: number,
  data: TerraformPathUpdate,
): Promise<TerraformPath> {
  const response = await api.put(`/settings/terraform/paths/${pathId}`, data);
  return response.data;
}

export async function deleteTerraformPath(pathId: number): Promise<void> {
  await api.delete(`/settings/terraform/paths/${pathId}`);
}

// =============================================================================
// S3 Bucket Test & Browse (Admin only)
// =============================================================================

export async function testS3Bucket(
  bucketName: string,
  region?: string,
): Promise<S3BucketTestResponse> {
  const response = await api.post("/settings/terraform/buckets/test", {
    bucket_name: bucketName,
    region: region || undefined,
  });
  return response.data;
}

export async function listS3BucketObjects(
  bucketName: string,
  prefix: string = "",
  region?: string,
): Promise<S3BucketListResponse> {
  const response = await api.post("/settings/terraform/buckets/list-objects", {
    bucket_name: bucketName,
    prefix,
    region: region || undefined,
  });
  return response.data;
}

// =============================================================================
// CyberArk Resources
// =============================================================================

import type {
  CyberArkSafeListResponse,
  CyberArkSafeDetail,
  CyberArkRoleListResponse,
  CyberArkRoleDetail,
  CyberArkSIAPolicyListResponse,
  CyberArkSIAPolicyDetail,
  CyberArkDriftResponse,
  CyberArkFilters,
  CyberArkUserListResponse,
  AccessMappingResponse,
  AccessMappingUserList,
  AccessMappingTargetList,
  CyberArkSettingsResponse,
  CyberArkSettingsUpdate,
  CyberArkConnectionTestRequest,
  CyberArkConnectionTestResponse,
  CyberArkSyncStatus,
  TenantDiscoveryRequest,
  TenantDiscoveryResponse,
  ScimSettingsResponse,
  ScimSettingsUpdate,
  ScimConnectionTestRequest,
  ScimConnectionTestResponse,
} from "@/types";

export async function getCyberArkSafes(
  filters?: CyberArkFilters,
): Promise<CyberArkSafeListResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/cyberark/safes", { params });
  return response.data;
}

export async function getCyberArkSafe(
  safeName: string,
): Promise<CyberArkSafeDetail> {
  const response = await api.get(
    `/cyberark/safes/${encodeURIComponent(safeName)}`,
  );
  return response.data;
}

export async function getCyberArkRoles(
  filters?: CyberArkFilters,
): Promise<CyberArkRoleListResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));

  const response = await api.get("/cyberark/roles", { params });
  return response.data;
}

export async function getCyberArkRole(
  roleId: string,
): Promise<CyberArkRoleDetail> {
  const response = await api.get(
    `/cyberark/roles/${encodeURIComponent(roleId)}`,
  );
  return response.data;
}

export async function getCyberArkSIAPolicies(
  filters?: CyberArkFilters,
): Promise<CyberArkSIAPolicyListResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.tf_managed !== undefined)
    params.append("tf_managed", String(filters.tf_managed));
  if (filters?.policy_type) params.append("policy_type", filters.policy_type);
  if (filters?.status) params.append("status", filters.status);

  const response = await api.get("/cyberark/sia-policies", { params });
  return response.data;
}

export async function getCyberArkSIAPolicy(
  policyId: string,
): Promise<CyberArkSIAPolicyDetail> {
  const response = await api.get(
    `/cyberark/sia-policies/${encodeURIComponent(policyId)}`,
  );
  return response.data;
}

export async function getCyberArkDrift(): Promise<CyberArkDriftResponse> {
  const response = await api.get("/cyberark/drift");
  return response.data;
}

export async function getCyberArkUsers(
  filters?: CyberArkFilters,
): Promise<CyberArkUserListResponse> {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.active !== undefined)
    params.append("active", String(filters.active));

  const response = await api.get("/cyberark/users", { params });
  return response.data;
}

// =============================================================================
// Access Mapping
// =============================================================================

export async function getAccessMapping(params?: {
  user?: string;
}): Promise<AccessMappingResponse> {
  const searchParams = new URLSearchParams();
  if (params?.user) searchParams.append("user", params.user);

  const response = await api.get("/access-mapping", { params: searchParams });
  return response.data;
}

export async function getAccessMappingUsers(): Promise<AccessMappingUserList> {
  const response = await api.get("/access-mapping/users");
  return response.data;
}

export async function getAccessMappingTargets(): Promise<AccessMappingTargetList> {
  const response = await api.get("/access-mapping/targets");
  return response.data;
}

// =============================================================================
// CyberArk Settings (Admin only)
// =============================================================================

export async function getCyberArkSettings(): Promise<CyberArkSettingsResponse> {
  const response = await api.get("/settings/cyberark");
  return response.data;
}

export async function updateCyberArkSettings(
  settings: CyberArkSettingsUpdate,
): Promise<CyberArkSettingsResponse> {
  const response = await api.put("/settings/cyberark", settings);
  return response.data;
}

export async function testCyberArkConnection(
  data: CyberArkConnectionTestRequest,
): Promise<CyberArkConnectionTestResponse> {
  const response = await api.post("/settings/cyberark/test", data);
  return response.data;
}

export async function getCyberArkSyncStatus(): Promise<CyberArkSyncStatus> {
  const response = await api.get("/settings/cyberark/status");
  return response.data;
}

export async function discoverCyberArkTenant(
  data: TenantDiscoveryRequest,
): Promise<TenantDiscoveryResponse> {
  const response = await api.post("/settings/cyberark/discover", data);
  return response.data;
}

// =============================================================================
// SCIM Settings (Admin only)
// =============================================================================

export async function getScimSettings(): Promise<ScimSettingsResponse> {
  const response = await api.get("/settings/cyberark/scim");
  return response.data;
}

export async function updateScimSettings(
  settings: ScimSettingsUpdate,
): Promise<ScimSettingsResponse> {
  const response = await api.put("/settings/cyberark/scim", settings);
  return response.data;
}

export async function testScimConnection(
  data: ScimConnectionTestRequest,
): Promise<ScimConnectionTestResponse> {
  const response = await api.post("/settings/cyberark/scim/test", data);
  return response.data;
}

export default api;
