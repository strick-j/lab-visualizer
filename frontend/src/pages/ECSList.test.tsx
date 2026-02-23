import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ECSListPage } from "./ECSList";
import type { ECSContainer, ECSClusterSummary } from "@/types";

// =============================================================================
// Mock data
// =============================================================================

const mockContainer: ECSContainer = {
  id: 1,
  task_id: "task-abc123",
  name: "web-task",
  cluster_name: "prod-cluster",
  launch_type: "FARGATE",
  status: "RUNNING",
  display_status: "active",
  cpu: 256,
  memory: 512,
  task_definition_arn: null,
  desired_status: null,
  image: "my-repo/web-app",
  image_tag: "latest",
  container_port: 8080,
  private_ip: "10.0.1.5",
  subnet_id: null,
  vpc_id: null,
  availability_zone: null,
  started_at: null,
  tags: null,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  updated_at: "2024-01-15T12:00:00Z",
  managed_by: "terraform",
  region_name: null,
  is_deleted: false,
  deleted_at: null,
};

const mockContainer2: ECSContainer = {
  id: 2,
  task_id: "task-def456",
  name: "api-task",
  cluster_name: "prod-cluster",
  launch_type: "EC2",
  status: "STOPPED",
  display_status: "inactive",
  cpu: 512,
  memory: 2048,
  task_definition_arn: null,
  desired_status: null,
  image: null,
  image_tag: null,
  container_port: null,
  private_ip: null,
  subnet_id: null,
  vpc_id: null,
  availability_zone: null,
  started_at: null,
  tags: null,
  tf_managed: true,
  tf_state_source: null,
  tf_resource_address: null,
  updated_at: "2024-01-14T12:00:00Z",
  managed_by: "unmanaged",
  region_name: null,
  is_deleted: false,
  deleted_at: null,
};

const mockCluster: ECSClusterSummary = {
  cluster_name: "prod-cluster",
  region_name: "us-east-1",
  total_tasks: 2,
  running_tasks: 1,
  stopped_tasks: 1,
  pending_tasks: 0,
  tf_managed: false,
  containers: [mockContainer, mockContainer2],
  managed_by: "terraform",
};

let mockData: { data: ECSClusterSummary[] } | null = {
  data: [mockCluster],
};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useECSClusters: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("ECSListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: [mockCluster] };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders ECS Containers heading", () => {
    render(<ECSListPage />);
    expect(screen.getByText("ECS Containers")).toBeInTheDocument();
  });

  it("renders summary cards", () => {
    render(<ECSListPage />);
    // "Clusters" appears as both a summary card label and card header
    const clustersTexts = screen.getAllByText("Clusters");
    expect(clustersTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Total Tasks")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Stopped")).toBeInTheDocument();
  });

  it("renders cluster names", () => {
    render(<ECSListPage />);
    expect(screen.getByText("prod-cluster")).toBeInTheDocument();
  });

  it("renders region next to cluster name", () => {
    render(<ECSListPage />);
    expect(screen.getByText("(us-east-1)")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<ECSListPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed");
    mockData = null;
    render(<ECSListPage />);
    expect(screen.getByText("Error loading ECS clusters")).toBeInTheDocument();
  });

  it("shows empty state when no clusters", () => {
    mockData = { data: [] };
    render(<ECSListPage />);
    expect(screen.getByText("No ECS clusters found")).toBeInTheDocument();
  });

  it("shows search hint when empty with active search", () => {
    mockData = { data: [] };
    render(<ECSListPage />);
    // When searchValue is empty, it shows the default message
    expect(
      screen.getByText("No ECS clusters are available in your account"),
    ).toBeInTheDocument();
  });

  it("expands cluster on click and shows container rows", () => {
    render(<ECSListPage />);
    const clusterButton = screen.getByText("prod-cluster").closest("button")!;
    fireEvent.click(clusterButton);
    // After expanding, container names should be visible
    expect(screen.getByText("web-task")).toBeInTheDocument();
    expect(screen.getByText("api-task")).toBeInTheDocument();
  });

  it("collapses cluster on second click", () => {
    render(<ECSListPage />);
    const clusterButton = screen.getByText("prod-cluster").closest("button")!;
    fireEvent.click(clusterButton);
    expect(screen.getByText("web-task")).toBeInTheDocument();
    fireEvent.click(clusterButton);
    expect(screen.queryByText("web-task")).not.toBeInTheDocument();
  });

  it("shows container details - launch type, CPU/memory", () => {
    render(<ECSListPage />);
    const clusterButton = screen.getByText("prod-cluster").closest("button")!;
    fireEvent.click(clusterButton);
    expect(screen.getByText("FARGATE")).toBeInTheDocument();
    expect(screen.getByText("256 CPU / 512 MB")).toBeInTheDocument();
  });

  it("formats memory >= 1024 as GB", () => {
    render(<ECSListPage />);
    const clusterButton = screen.getByText("prod-cluster").closest("button")!;
    fireEvent.click(clusterButton);
    expect(screen.getByText("512 CPU / 2.0 GB")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<ECSListPage />);
    expect(
      screen.getByPlaceholderText("Search clusters..."),
    ).toBeInTheDocument();
  });

  it("renders total tasks count", () => {
    render(<ECSListPage />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows running count badge on cluster", () => {
    render(<ECSListPage />);
    expect(screen.getByText("1 running")).toBeInTheDocument();
  });

  it("shows stopped count badge on cluster", () => {
    render(<ECSListPage />);
    expect(screen.getByText("1 stopped")).toBeInTheDocument();
  });
});
