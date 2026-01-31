import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  queryKeys,
  useStatusSummary,
  useEC2Instances,
  useEC2Instance,
  useRDSInstances,
  useRDSInstance,
  useVPCs,
  useVPC,
  useSubnets,
  useSubnet,
  useInternetGateways,
  useNATGateways,
  useElasticIPs,
  useTerraformStates,
  useDrift,
  useTopology,
} from "./useResources";
import type { DisplayStatus } from "@/types";

// Mock the API module with proper response structures
vi.mock("@/api", () => ({
  getStatusSummary: vi.fn(() =>
    Promise.resolve({
      total_resources: 10,
      last_refreshed: "2024-01-15T12:00:00Z",
    }),
  ),
  getEC2Instances: vi.fn(() =>
    Promise.resolve({
      data: [{ instance_id: "i-123", name: "Test Instance" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getEC2Instance: vi.fn((id: string) =>
    Promise.resolve({ instance_id: id, name: "Test Instance" }),
  ),
  getRDSInstances: vi.fn(() =>
    Promise.resolve({
      data: [{ db_instance_identifier: "rds-123", name: "Test RDS" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getRDSInstance: vi.fn((id: string) =>
    Promise.resolve({ db_instance_identifier: id, name: "Test RDS" }),
  ),
  getVPCs: vi.fn(() =>
    Promise.resolve({
      data: [{ vpc_id: "vpc-123", name: "Test VPC" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getVPC: vi.fn((id: string) =>
    Promise.resolve({ vpc_id: id, name: "Test VPC" }),
  ),
  getSubnets: vi.fn(() =>
    Promise.resolve({
      data: [{ subnet_id: "subnet-123", name: "Test Subnet" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getSubnet: vi.fn((id: string) =>
    Promise.resolve({ subnet_id: id, name: "Test Subnet" }),
  ),
  getInternetGateways: vi.fn(() =>
    Promise.resolve({
      data: [{ igw_id: "igw-123", name: "Test IGW" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getInternetGateway: vi.fn((id: string) =>
    Promise.resolve({ igw_id: id, name: "Test IGW" }),
  ),
  getNATGateways: vi.fn(() =>
    Promise.resolve({
      data: [{ nat_gateway_id: "nat-123", name: "Test NAT" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getNATGateway: vi.fn((id: string) =>
    Promise.resolve({ nat_gateway_id: id, name: "Test NAT" }),
  ),
  getElasticIPs: vi.fn(() =>
    Promise.resolve({
      data: [{ allocation_id: "eip-123", public_ip: "1.2.3.4" }],
      meta: { total: 1, last_refreshed: null },
    }),
  ),
  getElasticIP: vi.fn((id: string) =>
    Promise.resolve({ allocation_id: id, public_ip: "1.2.3.4" }),
  ),
  refreshData: vi.fn(() => Promise.resolve({ success: true })),
  getTerraformStates: vi.fn(() =>
    Promise.resolve({
      states: [{ name: "state-1", resource_count: 5 }],
      total_tf_managed_resources: 5,
    }),
  ),
  getDrift: vi.fn(() =>
    Promise.resolve({
      drift_detected: false,
      items: [],
      checked_at: "2024-01-15T12:00:00Z",
    }),
  ),
  getTopology: vi.fn(() =>
    Promise.resolve({
      vpcs: [],
      meta: {
        total_vpcs: 0,
        total_subnets: 0,
        total_ec2: 0,
        total_rds: 0,
        total_nat_gateways: 0,
        total_internet_gateways: 0,
        total_elastic_ips: 0,
        last_refreshed: null,
      },
    }),
  ),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("queryKeys", () => {
  it("generates correct status summary key", () => {
    expect(queryKeys.statusSummary).toEqual(["status-summary"]);
  });

  it("generates correct ec2 instances key with filters", () => {
    const filters = { search: "test" };
    expect(queryKeys.ec2Instances(filters)).toEqual(["ec2-instances", filters]);
  });

  it("generates correct ec2 instance key", () => {
    expect(queryKeys.ec2Instance("i-123")).toEqual(["ec2-instance", "i-123"]);
  });

  it("generates correct rds instances key with filters", () => {
    const filters = { status: "active" as DisplayStatus };
    expect(queryKeys.rdsInstances(filters)).toEqual(["rds-instances", filters]);
  });

  it("generates correct vpc key", () => {
    expect(queryKeys.vpc("vpc-123")).toEqual(["vpc", "vpc-123"]);
  });

  it("generates correct subnet key", () => {
    expect(queryKeys.subnet("subnet-123")).toEqual(["subnet", "subnet-123"]);
  });

  it("generates correct terraform states key", () => {
    expect(queryKeys.terraformStates).toEqual(["terraform-states"]);
  });

  it("generates correct topology key with filters", () => {
    const filters = { vpc_id: "vpc-123" };
    expect(queryKeys.topology(filters)).toEqual(["topology", filters]);
  });
});

describe("useStatusSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches status summary data", async () => {
    const { result } = renderHook(() => useStatusSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      total_resources: 10,
      last_refreshed: "2024-01-15T12:00:00Z",
    });
  });
});

describe("useEC2Instances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches EC2 instances", async () => {
    const { result } = renderHook(() => useEC2Instances(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data?.[0].instance_id).toBe("i-123");
  });

  it("fetches EC2 instances with filters", async () => {
    const filters = { search: "test" };
    const { result } = renderHook(() => useEC2Instances(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useEC2Instance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single EC2 instance", async () => {
    const { result } = renderHook(() => useEC2Instance("i-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.instance_id).toBe("i-123");
  });

  it("does not fetch when instanceId is empty", () => {
    const { result } = renderHook(() => useEC2Instance(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useRDSInstances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches RDS instances", async () => {
    const { result } = renderHook(() => useRDSInstances(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useRDSInstance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single RDS instance", async () => {
    const { result } = renderHook(() => useRDSInstance("rds-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.db_instance_identifier).toBe("rds-123");
  });
});

describe("useVPCs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches VPCs", async () => {
    const { result } = renderHook(() => useVPCs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data?.[0].vpc_id).toBe("vpc-123");
  });
});

describe("useVPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single VPC", async () => {
    const { result } = renderHook(() => useVPC("vpc-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.vpc_id).toBe("vpc-123");
  });
});

describe("useSubnets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches subnets", async () => {
    const { result } = renderHook(() => useSubnets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useSubnet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single subnet", async () => {
    const { result } = renderHook(() => useSubnet("subnet-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.subnet_id).toBe("subnet-123");
  });
});

describe("useInternetGateways", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches internet gateways", async () => {
    const { result } = renderHook(() => useInternetGateways(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useNATGateways", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches NAT gateways", async () => {
    const { result } = renderHook(() => useNATGateways(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useElasticIPs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches elastic IPs", async () => {
    const { result } = renderHook(() => useElasticIPs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data?.[0].public_ip).toBe("1.2.3.4");
  });
});

describe("useTerraformStates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches terraform states", async () => {
    const { result } = renderHook(() => useTerraformStates(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.states).toHaveLength(1);
    expect(result.current.data?.states?.[0].name).toBe("state-1");
  });
});

describe("useDrift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches drift data", async () => {
    const { result } = renderHook(() => useDrift(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.drift_detected).toBe(false);
  });
});

describe("useTopology", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches topology data", async () => {
    const { result } = renderHook(() => useTopology(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.vpcs).toEqual([]);
  });

  it("fetches topology with VPC filter", async () => {
    const { result } = renderHook(() => useTopology({ vpc_id: "vpc-123" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
