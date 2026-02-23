import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  queryKeys,
  useECSClusters,
  useECSSummary,
  useS3Buckets,
  useS3Bucket,
  useRefreshData,
  useCyberArkSafes,
  useCyberArkSafe,
  useCyberArkRoles,
  useCyberArkRole,
  useCyberArkSIAPolicies,
  useCyberArkSIAPolicy,
  useCyberArkDrift,
  useCyberArkUsers,
  useAccessMapping,
  useAccessMappingUsers,
  useAccessMappingTargets,
} from "./useResources";

// =============================================================================
// Mock API
// =============================================================================

vi.mock("@/api", () => ({
  getStatusSummary: vi.fn(() => Promise.resolve({})),
  getAppInfo: vi.fn(() => Promise.resolve({})),
  getEC2Instances: vi.fn(() => Promise.resolve({ data: [] })),
  getEC2Instance: vi.fn(() => Promise.resolve({})),
  getRDSInstances: vi.fn(() => Promise.resolve({ data: [] })),
  getRDSInstance: vi.fn(() => Promise.resolve({})),
  getECSContainers: vi.fn(() => Promise.resolve({ data: [] })),
  getECSContainer: vi.fn(() => Promise.resolve({})),
  getECSClusters: vi.fn(() =>
    Promise.resolve({
      data: [
        {
          cluster_name: "prod",
          total_tasks: 3,
          running_tasks: 2,
          stopped_tasks: 1,
          pending_tasks: 0,
          containers: [],
        },
      ],
    }),
  ),
  getECSSummary: vi.fn(() =>
    Promise.resolve({
      clusters: 2,
      services: 3,
      total_tasks: 5,
      running_tasks: 4,
      stopped_tasks: 1,
      pending_tasks: 0,
    }),
  ),
  getVPCs: vi.fn(() => Promise.resolve({ data: [] })),
  getVPC: vi.fn(() => Promise.resolve({})),
  getSubnets: vi.fn(() => Promise.resolve({ data: [] })),
  getSubnet: vi.fn(() => Promise.resolve({})),
  getInternetGateways: vi.fn(() => Promise.resolve({ data: [] })),
  getInternetGateway: vi.fn(() => Promise.resolve({})),
  getNATGateways: vi.fn(() => Promise.resolve({ data: [] })),
  getNATGateway: vi.fn(() => Promise.resolve({})),
  getElasticIPs: vi.fn(() => Promise.resolve({ data: [] })),
  getElasticIP: vi.fn(() => Promise.resolve({})),
  getS3Buckets: vi.fn(() =>
    Promise.resolve({
      data: [{ bucket_name: "my-bucket", region: "us-east-1" }],
      meta: { total: 1 },
    }),
  ),
  getS3Bucket: vi.fn((name: string) =>
    Promise.resolve({ bucket_name: name, region: "us-east-1" }),
  ),
  refreshData: vi.fn(() => Promise.resolve({ success: true })),
  getTerraformStates: vi.fn(() => Promise.resolve({ states: [] })),
  getDrift: vi.fn(() => Promise.resolve({ drift_detected: false, items: [] })),
  getTopology: vi.fn(() => Promise.resolve({ vpcs: [], meta: {} })),
  getCyberArkSafes: vi.fn(() =>
    Promise.resolve({
      data: [{ safe_name: "AdminSafe", description: "Admin safe" }],
      meta: { total: 1 },
    }),
  ),
  getCyberArkSafe: vi.fn((name: string) =>
    Promise.resolve({ safe_name: name, description: "test" }),
  ),
  getCyberArkRoles: vi.fn(() =>
    Promise.resolve({
      data: [{ role_id: "role-1", role_name: "Admin" }],
      meta: { total: 1 },
    }),
  ),
  getCyberArkRole: vi.fn((id: string) =>
    Promise.resolve({ role_id: id, role_name: "Admin" }),
  ),
  getCyberArkSIAPolicies: vi.fn(() =>
    Promise.resolve({
      data: [{ policy_id: "pol-1", policy_name: "Default" }],
      meta: { total: 1 },
    }),
  ),
  getCyberArkSIAPolicy: vi.fn((id: string) =>
    Promise.resolve({ policy_id: id, policy_name: "Default" }),
  ),
  getCyberArkDrift: vi.fn(() =>
    Promise.resolve({ drift_detected: false, items: [] }),
  ),
  getCyberArkUsers: vi.fn(() =>
    Promise.resolve({
      data: [{ user_id: "u1", user_name: "john" }],
      meta: { total: 1 },
    }),
  ),
  getAccessMapping: vi.fn(() =>
    Promise.resolve({
      users: [{ user_id: "u1" }],
      targets: [],
      total_users: 1,
      total_targets: 0,
      total_standing_paths: 0,
      total_jit_paths: 0,
    }),
  ),
  getAccessMappingUsers: vi.fn(() =>
    Promise.resolve({ users: [{ user_id: "u1", user_name: "john" }] }),
  ),
  getAccessMappingTargets: vi.fn(() =>
    Promise.resolve({ targets: [{ target_id: "t1" }] }),
  ),
}));

// =============================================================================
// Helper
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

// =============================================================================
// ECS Clusters
// =============================================================================

describe("useECSClusters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches ECS clusters", async () => {
    const { result } = renderHook(() => useECSClusters(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].cluster_name).toBe("prod");
  });

  it("passes filters to query", async () => {
    const { result } = renderHook(() => useECSClusters({ search: "prod" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useECSSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches ECS summary", async () => {
    const { result } = renderHook(() => useECSSummary(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.clusters).toBe(2);
  });
});

// =============================================================================
// S3 Buckets
// =============================================================================

describe("useS3Buckets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches S3 buckets", async () => {
    const { result } = renderHook(() => useS3Buckets(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useS3Bucket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single S3 bucket", async () => {
    const { result } = renderHook(() => useS3Bucket("my-bucket"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.bucket_name).toBe("my-bucket");
  });

  it("is disabled when name is empty", () => {
    const { result } = renderHook(() => useS3Bucket(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// =============================================================================
// Refresh Data
// =============================================================================

describe("useRefreshData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("provides a mutation function", async () => {
    const { result } = renderHook(() => useRefreshData(), {
      wrapper: createWrapper(),
    });
    expect(result.current.mutateAsync).toBeDefined();
  });
});

// =============================================================================
// CyberArk Safes
// =============================================================================

describe("useCyberArkSafes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches safes", async () => {
    const { result } = renderHook(() => useCyberArkSafes(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data[0].safe_name).toBe("AdminSafe");
  });

  it("passes filters", async () => {
    const { result } = renderHook(() => useCyberArkSafes({ search: "admin" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useCyberArkSafe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single safe", async () => {
    const { result } = renderHook(() => useCyberArkSafe("AdminSafe"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.safe_name).toBe("AdminSafe");
  });

  it("is disabled when name is empty", () => {
    const { result } = renderHook(() => useCyberArkSafe(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// =============================================================================
// CyberArk Roles
// =============================================================================

describe("useCyberArkRoles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches roles", async () => {
    const { result } = renderHook(() => useCyberArkRoles(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useCyberArkRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single role", async () => {
    const { result } = renderHook(() => useCyberArkRole("role-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.role_id).toBe("role-1");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useCyberArkRole(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// =============================================================================
// CyberArk SIA Policies
// =============================================================================

describe("useCyberArkSIAPolicies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches SIA policies", async () => {
    const { result } = renderHook(() => useCyberArkSIAPolicies(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });
});

describe("useCyberArkSIAPolicy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches single policy", async () => {
    const { result } = renderHook(() => useCyberArkSIAPolicy("pol-1"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.policy_id).toBe("pol-1");
  });

  it("is disabled when id is empty", () => {
    const { result } = renderHook(() => useCyberArkSIAPolicy(""), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// =============================================================================
// CyberArk Drift
// =============================================================================

describe("useCyberArkDrift", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches drift data", async () => {
    const { result } = renderHook(() => useCyberArkDrift(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.drift_detected).toBe(false);
  });
});

// =============================================================================
// CyberArk Users
// =============================================================================

describe("useCyberArkUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches users", async () => {
    const { result } = renderHook(() => useCyberArkUsers(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
  });

  it("passes filters", async () => {
    const { result } = renderHook(() => useCyberArkUsers({ search: "john" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// =============================================================================
// Access Mapping
// =============================================================================

describe("useAccessMapping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches access mapping", async () => {
    const { result } = renderHook(() => useAccessMapping(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_users).toBe(1);
  });

  it("passes user param", async () => {
    const { result } = renderHook(() => useAccessMapping({ user: "john" }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAccessMappingUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches access mapping users", async () => {
    const { result } = renderHook(() => useAccessMappingUsers(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.users).toHaveLength(1);
  });
});

describe("useAccessMappingTargets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches access mapping targets", async () => {
    const { result } = renderHook(() => useAccessMappingTargets(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.targets).toHaveLength(1);
  });
});

// =============================================================================
// Query Key Shape Tests
// =============================================================================

describe("queryKeys - CyberArk/Access Mapping/S3", () => {
  it("generates correct cyberark-safes key", () => {
    expect(queryKeys.cyberArkSafes()).toEqual(["cyberark-safes", undefined]);
  });

  it("generates correct cyberark-safes key with filters", () => {
    const f = { search: "test" };
    expect(queryKeys.cyberArkSafes(f)).toEqual(["cyberark-safes", f]);
  });

  it("generates correct cyberark-role key", () => {
    expect(queryKeys.cyberArkRole("r1")).toEqual(["cyberark-role", "r1"]);
  });

  it("generates correct access-mapping key", () => {
    expect(queryKeys.accessMapping()).toEqual(["access-mapping", undefined]);
  });

  it("generates correct access-mapping-users key", () => {
    expect(queryKeys.accessMappingUsers).toEqual(["access-mapping-users"]);
  });

  it("generates correct access-mapping-targets key", () => {
    expect(queryKeys.accessMappingTargets).toEqual(["access-mapping-targets"]);
  });

  it("generates correct s3-buckets key", () => {
    expect(queryKeys.s3Buckets()).toEqual(["s3-buckets", undefined]);
  });

  it("generates correct s3-bucket key", () => {
    expect(queryKeys.s3Bucket("my-bucket")).toEqual(["s3-bucket", "my-bucket"]);
  });

  it("generates correct ecs-clusters key", () => {
    expect(queryKeys.ecsClusters()).toEqual(["ecs-clusters", undefined]);
  });

  it("generates correct ecs-summary key", () => {
    expect(queryKeys.ecsSummary).toEqual(["ecs-summary"]);
  });

  it("generates correct cyberark-drift key", () => {
    expect(queryKeys.cyberArkDrift).toEqual(["cyberark-drift"]);
  });

  it("generates correct cyberark-users key with filters", () => {
    const f = { active: true };
    expect(queryKeys.cyberArkUsers(f)).toEqual(["cyberark-users", f]);
  });
});
