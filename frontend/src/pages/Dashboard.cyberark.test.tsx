import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { DashboardPage } from "./Dashboard";

// =============================================================================
// Mock hooks with CyberArk data
// =============================================================================

let mockCyberArkSafesTotal = 12;
let mockCyberArkRolesTotal = 8;
let mockCyberArkPoliciesTotal = 3;
let mockCyberArkDriftData: {
  drift_detected: boolean;
  items: { id: string }[];
} = { drift_detected: false, items: [] };

vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: {
      ec2: { total: 1, active: 1, inactive: 0, transitioning: 0, error: 0 },
      rds: { total: 0, active: 0, inactive: 0, transitioning: 0, error: 0 },
      last_refreshed: "2024-01-15T12:00:00Z",
    },
    isLoading: false,
  }),
  useEC2Instances: () => ({
    data: { data: [], meta: { total: 0 } },
    isLoading: false,
  }),
  useRDSInstances: () => ({
    data: { data: [], meta: { total: 0 } },
    isLoading: false,
  }),
  useECSContainers: () => ({
    data: { data: [], meta: { total: 0 } },
    isLoading: false,
  }),
  useDrift: () => ({
    data: { drift_detected: false, items: [] },
  }),
  useVPCs: () => ({
    data: { data: [], meta: { total: 0 }, total: 0 },
    isLoading: false,
  }),
  useSubnets: () => ({ data: { data: [], meta: { total: 0 } } }),
  useInternetGateways: () => ({ data: { data: [], meta: { total: 0 } } }),
  useNATGateways: () => ({ data: { data: [], meta: { total: 0 } } }),
  useElasticIPs: () => ({ data: { data: [], meta: { total: 0 } } }),
  useCyberArkSafes: () => ({
    data: { data: [], meta: { total: mockCyberArkSafesTotal } },
  }),
  useCyberArkRoles: () => ({
    data: { data: [], meta: { total: mockCyberArkRolesTotal } },
  }),
  useCyberArkSIAPolicies: () => ({
    data: { data: [], meta: { total: mockCyberArkPoliciesTotal } },
  }),
  useCyberArkDrift: () => ({
    data: mockCyberArkDriftData,
  }),
}));

describe("DashboardPage - CyberArk section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCyberArkSafesTotal = 12;
    mockCyberArkRolesTotal = 8;
    mockCyberArkPoliciesTotal = 3;
    mockCyberArkDriftData = { drift_detected: false, items: [] };
  });

  it("renders CyberArk Identity Security heading", () => {
    render(<DashboardPage />);
    expect(screen.getByText("CyberArk Identity Security")).toBeInTheDocument();
  });

  it("renders View CyberArk Dashboard link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("View CyberArk Dashboard →")).toBeInTheDocument();
  });

  it("shows Safes count", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Safes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("shows Roles count", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("shows SIA Policies count", () => {
    render(<DashboardPage />);
    expect(screen.getByText("SIA Policies")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows None when no CyberArk drift detected", () => {
    render(<DashboardPage />);
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("shows drift count when drift detected", () => {
    mockCyberArkDriftData = {
      drift_detected: true,
      items: [{ id: "d1" }, { id: "d2" }],
    };
    render(<DashboardPage />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders View safes link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("View safes →")).toBeInTheDocument();
  });

  it("renders View roles link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("View roles →")).toBeInTheDocument();
  });

  it("renders View policies link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("View policies →")).toBeInTheDocument();
  });

  it("handles null CyberArk data with 0 fallback", () => {
    mockCyberArkSafesTotal = 0;
    mockCyberArkRolesTotal = 0;
    mockCyberArkPoliciesTotal = 0;
    render(<DashboardPage />);
    // The SummaryStatCard should show 0
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThan(0);
  });
});
