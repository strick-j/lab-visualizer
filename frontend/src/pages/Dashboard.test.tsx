import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { DashboardPage } from "./Dashboard";

// Mock data
const mockSummary = {
  ec2: { total: 5, active: 3, inactive: 1, transitioning: 1, error: 0 },
  rds: { total: 3, active: 2, inactive: 1, transitioning: 0, error: 0 },
  last_refreshed: "2024-01-15T12:00:00Z",
};

const mockEC2Instances = [
  {
    instance_id: "i-123",
    name: "web-server-1",
    instance_type: "t3.micro",
    display_status: "active",
  },
  {
    instance_id: "i-456",
    name: "api-server-1",
    instance_type: "t3.small",
    display_status: "inactive",
  },
];

const mockRDSInstances = [
  {
    db_instance_identifier: "prod-db",
    name: "Production DB",
    engine: "mysql",
    engine_version: "8.0",
    display_status: "active",
  },
];

const mockECSContainers = [
  {
    task_id: "task-abc123",
    name: "web-task",
    cluster_name: "prod-cluster",
    display_status: "active",
  },
];

const mockDrift = {
  drift_detected: false,
  items: [],
};

const mockVPCs = [
  {
    vpc_id: "vpc-123",
    name: "main-vpc",
    cidr_block: "10.0.0.0/16",
    display_status: "active",
  },
];

let mockSummaryLoading = false;
let mockEc2Loading = false;
let mockRdsLoading = false;
let mockEcsLoading = false;

vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: mockSummaryLoading ? null : mockSummary,
    isLoading: mockSummaryLoading,
  }),
  useEC2Instances: () => ({
    data: { data: mockEC2Instances },
    isLoading: mockEc2Loading,
  }),
  useRDSInstances: () => ({
    data: { data: mockRDSInstances },
    isLoading: mockRdsLoading,
  }),
  useECSContainers: () => ({
    data: { data: mockECSContainers, meta: { total: 1 } },
    isLoading: mockEcsLoading,
  }),
  useDrift: () => ({
    data: mockDrift,
  }),
  useVPCs: () => ({
    data: { data: mockVPCs, meta: { total: 1 } },
    isLoading: false,
  }),
  useSubnets: () => ({
    data: { data: [], meta: { total: 2 } },
  }),
  useInternetGateways: () => ({
    data: { data: [], meta: { total: 1 } },
  }),
  useNATGateways: () => ({
    data: { data: [], meta: { total: 1 } },
  }),
  useElasticIPs: () => ({
    data: { data: [], meta: { total: 2 } },
  }),
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSummaryLoading = false;
    mockEc2Loading = false;
    mockRdsLoading = false;
    mockEcsLoading = false;
  });

  it("renders page title", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders page description", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText("Overview of your AWS infrastructure"),
    ).toBeInTheDocument();
  });

  it("renders EC2 summary card", () => {
    render(<DashboardPage />);
    expect(screen.getByText("EC2 Instances")).toBeInTheDocument();
  });

  it("renders RDS summary card", () => {
    render(<DashboardPage />);
    expect(screen.getByText("RDS Databases")).toBeInTheDocument();
  });

  it("renders Terraform Status card", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Terraform Status")).toBeInTheDocument();
  });

  it("shows no drift message when no drift detected", () => {
    render(<DashboardPage />);
    expect(screen.getByText("No drift detected")).toBeInTheDocument();
  });

  it("renders Recent EC2 Instances section", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Recent EC2 Instances")).toBeInTheDocument();
  });

  it("renders Recent RDS Databases section", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Recent RDS Databases")).toBeInTheDocument();
  });

  it("renders EC2 instance data", () => {
    render(<DashboardPage />);
    expect(screen.getByText("web-server-1")).toBeInTheDocument();
    expect(screen.getByText("t3.micro")).toBeInTheDocument();
  });

  it("renders RDS instance data", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Production DB")).toBeInTheDocument();
    expect(screen.getByText("mysql 8.0")).toBeInTheDocument();
  });

  it("renders ECS summary card", () => {
    render(<DashboardPage />);
    expect(screen.getByText("ECS Containers")).toBeInTheDocument();
  });

  it("renders Recent ECS Containers section", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Recent ECS Containers")).toBeInTheDocument();
    expect(screen.getByText("web-task")).toBeInTheDocument();
    expect(screen.getByText("prod-cluster")).toBeInTheDocument();
  });

  it("renders view all links", () => {
    render(<DashboardPage />);
    const viewAllLinks = screen.getAllByText("View all →");
    // Now there are 4 "View all" links (EC2, RDS, ECS, VPC)
    expect(viewAllLinks).toHaveLength(4);
  });

  it("renders View Terraform details link", () => {
    render(<DashboardPage />);
    expect(screen.getByText("View Terraform details →")).toBeInTheDocument();
  });

  it("shows loading state when summary is loading", () => {
    mockSummaryLoading = true;
    const { container } = render(<DashboardPage />);
    // PageLoading shows a spinner with animate-spin class
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows loading message for EC2 when loading", () => {
    mockEc2Loading = true;
    render(<DashboardPage />);
    // The loading message is inside the EC2 card
    const loadingElements = screen.getAllByText("Loading...");
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it("renders last refresh time", () => {
    render(<DashboardPage />);
    expect(screen.getByText(/Data last refreshed/)).toBeInTheDocument();
  });
});
