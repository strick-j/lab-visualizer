import axios from 'axios';
import type {
  ListResponse,
  EC2Instance,
  RDSInstance,
  StatusSummary,
  RefreshResponse,
  TerraformStatesResponse,
  DriftResponse,
  ResourceFilters,
} from '@/types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication (if needed)
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =============================================================================
// Health & Status
// =============================================================================

export async function getHealthStatus(): Promise<{ status: string; timestamp: string }> {
  const response = await api.get('/health');
  return response.data;
}

export async function getStatusSummary(): Promise<StatusSummary> {
  const response = await api.get('/status/summary');
  return response.data;
}

// =============================================================================
// EC2 Instances
// =============================================================================

export async function getEC2Instances(
  filters?: ResourceFilters
): Promise<ListResponse<EC2Instance>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.region) params.append('region', filters.region);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tf_managed !== undefined) params.append('tf_managed', String(filters.tf_managed));

  const response = await api.get('/ec2', { params });
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
  filters?: ResourceFilters
): Promise<ListResponse<RDSInstance>> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.region) params.append('region', filters.region);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tf_managed !== undefined) params.append('tf_managed', String(filters.tf_managed));

  const response = await api.get('/rds', { params });
  return response.data;
}

export async function getRDSInstance(dbIdentifier: string): Promise<RDSInstance> {
  const response = await api.get(`/rds/${dbIdentifier}`);
  return response.data;
}

// =============================================================================
// Refresh
// =============================================================================

export async function refreshData(force = false): Promise<RefreshResponse> {
  const response = await api.post('/refresh', { force });
  return response.data;
}

// =============================================================================
// Terraform
// =============================================================================

export async function getTerraformStates(): Promise<TerraformStatesResponse> {
  const response = await api.get('/terraform/states');
  return response.data;
}

export async function getDrift(): Promise<DriftResponse> {
  const response = await api.get('/terraform/drift');
  return response.data;
}

export default api;
