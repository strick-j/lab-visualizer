import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
  getHealthStatus,
  getStatusSummary,
  getEC2Instances,
  getEC2Instance,
  getRDSInstances,
  getRDSInstance,
  getVPCs,
  getVPC,
  getSubnets,
  getSubnet,
  getInternetGateways,
  getInternetGateway,
  getNATGateways,
  getNATGateway,
  getElasticIPs,
  getElasticIP,
  refreshData,
  getTerraformStates,
  getDrift,
  getTopology,
} from './client';

// Mock axios - type assertion for self-reference
interface MockAxiosInstance {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  interceptors: {
    request: { use: ReturnType<typeof vi.fn> };
    response: { use: ReturnType<typeof vi.fn> };
  };
}

vi.mock('axios', () => {
  const mockAxios: MockAxiosInstance = {
    create: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  mockAxios.create.mockReturnValue(mockAxios);
  return { default: mockAxios };
});

const mockedAxios = axios as unknown as {
  create: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getHealthStatus', () => {
    it('fetches health status', async () => {
      const mockResponse = { data: { status: 'healthy', timestamp: '2024-01-15T12:00:00Z' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getHealthStatus();

      expect(mockedAxios.get).toHaveBeenCalledWith('/health');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getStatusSummary', () => {
    it('fetches status summary', async () => {
      const mockResponse = {
        data: {
          total_resources: 10,
          last_refreshed: '2024-01-15T12:00:00Z',
        },
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getStatusSummary();

      expect(mockedAxios.get).toHaveBeenCalledWith('/status/summary');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getEC2Instances', () => {
    it('fetches EC2 instances without filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getEC2Instances();

      expect(mockedAxios.get).toHaveBeenCalledWith('/ec2', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches EC2 instances with status filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getEC2Instances({ status: 'active' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('status')).toBe('active');
    });

    it('fetches EC2 instances with search filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getEC2Instances({ search: 'web-server' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('search')).toBe('web-server');
    });

    it('fetches EC2 instances with tf_managed filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getEC2Instances({ tf_managed: true });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('tf_managed')).toBe('true');
    });
  });

  describe('getEC2Instance', () => {
    it('fetches single EC2 instance', async () => {
      const mockResponse = { data: { instance_id: 'i-123', name: 'Test' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getEC2Instance('i-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/ec2/i-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getRDSInstances', () => {
    it('fetches RDS instances without filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getRDSInstances();

      expect(mockedAxios.get).toHaveBeenCalledWith('/rds', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches RDS instances with filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getRDSInstances({ status: 'active', region: 'us-east-1' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('status')).toBe('active');
      expect(call[1].params.get('region')).toBe('us-east-1');
    });
  });

  describe('getRDSInstance', () => {
    it('fetches single RDS instance', async () => {
      const mockResponse = { data: { db_instance_identifier: 'prod-db', name: 'Test' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getRDSInstance('prod-db');

      expect(mockedAxios.get).toHaveBeenCalledWith('/rds/prod-db');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getVPCs', () => {
    it('fetches VPCs without filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getVPCs();

      expect(mockedAxios.get).toHaveBeenCalledWith('/vpcs', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getVPC', () => {
    it('fetches single VPC', async () => {
      const mockResponse = { data: { vpc_id: 'vpc-123', name: 'Test' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getVPC('vpc-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/vpcs/vpc-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getSubnets', () => {
    it('fetches subnets without filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getSubnets();

      expect(mockedAxios.get).toHaveBeenCalledWith('/subnets', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches subnets with vpc_id filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getSubnets({ vpc_id: 'vpc-123' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('vpc_id')).toBe('vpc-123');
    });

    it('fetches subnets with subnet_type filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getSubnets({ subnet_type: 'public' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('subnet_type')).toBe('public');
    });
  });

  describe('getSubnet', () => {
    it('fetches single subnet', async () => {
      const mockResponse = { data: { subnet_id: 'subnet-123', name: 'Test' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getSubnet('subnet-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/subnets/subnet-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getInternetGateways', () => {
    it('fetches internet gateways', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getInternetGateways();

      expect(mockedAxios.get).toHaveBeenCalledWith('/internet-gateways', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches internet gateways with vpc_id filter', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getInternetGateways({ vpc_id: 'vpc-123' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('vpc_id')).toBe('vpc-123');
    });
  });

  describe('getInternetGateway', () => {
    it('fetches single internet gateway', async () => {
      const mockResponse = { data: { igw_id: 'igw-123' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getInternetGateway('igw-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/internet-gateways/igw-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getNATGateways', () => {
    it('fetches NAT gateways', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getNATGateways();

      expect(mockedAxios.get).toHaveBeenCalledWith('/nat-gateways', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches NAT gateways with filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getNATGateways({ vpc_id: 'vpc-123', subnet_id: 'subnet-456', connectivity_type: 'public' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('vpc_id')).toBe('vpc-123');
      expect(call[1].params.get('subnet_id')).toBe('subnet-456');
      expect(call[1].params.get('connectivity_type')).toBe('public');
    });
  });

  describe('getNATGateway', () => {
    it('fetches single NAT gateway', async () => {
      const mockResponse = { data: { nat_gateway_id: 'nat-123' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getNATGateway('nat-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/nat-gateways/nat-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getElasticIPs', () => {
    it('fetches elastic IPs', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getElasticIPs();

      expect(mockedAxios.get).toHaveBeenCalledWith('/elastic-ips', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches elastic IPs with filters', async () => {
      const mockResponse = { data: { items: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getElasticIPs({ instance_id: 'i-123', associated: true });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('instance_id')).toBe('i-123');
      expect(call[1].params.get('associated')).toBe('true');
    });
  });

  describe('getElasticIP', () => {
    it('fetches single elastic IP', async () => {
      const mockResponse = { data: { allocation_id: 'eipalloc-123' } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getElasticIP('eipalloc-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/elastic-ips/eipalloc-123');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('refreshData', () => {
    it('refreshes data without force', async () => {
      const mockResponse = { data: { success: true, message: 'Refreshed' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await refreshData();

      expect(mockedAxios.post).toHaveBeenCalledWith('/refresh', { force: false });
      expect(result).toEqual(mockResponse.data);
    });

    it('refreshes data with force', async () => {
      const mockResponse = { data: { success: true, message: 'Force refreshed' } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await refreshData(true);

      expect(mockedAxios.post).toHaveBeenCalledWith('/refresh', { force: true });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getTerraformStates', () => {
    it('fetches terraform states', async () => {
      const mockResponse = { data: { states: [], total: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getTerraformStates();

      expect(mockedAxios.get).toHaveBeenCalledWith('/terraform/states');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getDrift', () => {
    it('fetches drift data', async () => {
      const mockResponse = { data: { has_drift: false, drifts: [] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getDrift();

      expect(mockedAxios.get).toHaveBeenCalledWith('/terraform/drift');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getTopology', () => {
    it('fetches topology without filters', async () => {
      const mockResponse = { data: { nodes: [], edges: [] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await getTopology();

      expect(mockedAxios.get).toHaveBeenCalledWith('/topology', { params: expect.any(URLSearchParams) });
      expect(result).toEqual(mockResponse.data);
    });

    it('fetches topology with vpc_id filter', async () => {
      const mockResponse = { data: { nodes: [], edges: [] } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await getTopology({ vpc_id: 'vpc-123' });

      const call = mockedAxios.get.mock.calls[0];
      expect(call[1].params.get('vpc_id')).toBe('vpc-123');
    });
  });
});
