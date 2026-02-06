import axios from "axios";
import type {
  ListResponse,
  EC2Instance,
  RDSInstance,
  VPC,
  Subnet,
  InternetGateway,
  NATGateway,
  ElasticIP,
  StatusSummary,
  RefreshResponse,
  TerraformStatesResponse,
  DriftResponse,
  ResourceFilters,
  AuthConfig,
  LoginCredentials,
  TokenResponse,
  User,
  OIDCLoginResponse,
  AuthSettingsResponse,
  OIDCSettings,
  OIDCSettingsUpdate,
  TestConnectionResponse,
  PasswordChangeRequest,
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

export default api;
