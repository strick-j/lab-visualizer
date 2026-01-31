import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { InfrastructureTopology } from "./InfrastructureTopology";

// Mock interfaces for topology components
interface MockTopologyCanvasProps {
  data?: { vpcs?: { vpc_id: string }[] };
  onNodeClick?: (
    id: string,
    type: string,
    data: { label: string; type: string },
  ) => void;
}

interface MockTopologyLegendProps {
  stats?: { total_vpcs: number };
}

// Mock the topology components
vi.mock("./TopologyCanvas", () => ({
  TopologyCanvas: ({ data, onNodeClick }: MockTopologyCanvasProps) => (
    <div data-testid="topology-canvas">
      <button
        data-testid="test-node"
        onClick={() =>
          onNodeClick?.("node-1", "ec2", { label: "Test Node", type: "ec2" })
        }
      >
        Test Node
      </button>
      <span data-testid="vpc-count">{data?.vpcs?.length || 0} VPCs</span>
    </div>
  ),
}));

vi.mock("./TopologyLegend", () => ({
  TopologyLegend: ({ stats }: MockTopologyLegendProps) => (
    <div data-testid="topology-legend">
      {stats && <span>Stats: {stats.total_vpcs} VPCs</span>}
    </div>
  ),
}));

const mockTopologyData = {
  vpcs: [
    {
      vpc_id: "vpc-123",
      name: "Test VPC",
      cidr_block: "10.0.0.0/16",
      display_status: "active",
      tf_managed: true,
    },
  ],
  subnets: [],
  ec2_instances: [],
  rds_instances: [],
  internet_gateways: [],
  nat_gateways: [],
  meta: { total_vpcs: 1, total_subnets: 0, total_ec2: 0, total_rds: 0 },
};

let mockData: typeof mockTopologyData | null = mockTopologyData;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks/useResources", () => ({
  useTopology: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    refetch: mockRefetch,
  }),
  useRefreshData: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe("InfrastructureTopology", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = mockTopologyData;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
  });

  it("renders loading state", () => {
    mockIsLoading = true;
    mockData = null;
    render(<InfrastructureTopology />);
    expect(
      screen.getByText("Loading infrastructure topology..."),
    ).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockIsError = true;
    mockError = new Error("Network error");
    mockData = null;
    render(<InfrastructureTopology />);
    expect(screen.getByText("Failed to load topology")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders error state with generic message when error is not an Error instance", () => {
    mockIsError = true;
    mockError = null;
    mockData = null;
    render(<InfrastructureTopology />);
    expect(screen.getByText("An error occurred")).toBeInTheDocument();
  });

  it("renders retry button in error state", () => {
    mockIsError = true;
    mockData = null;
    render(<InfrastructureTopology />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("calls refetch when retry button is clicked", () => {
    mockIsError = true;
    mockData = null;
    render(<InfrastructureTopology />);
    fireEvent.click(screen.getByText("Retry"));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders empty state when no VPCs", () => {
    mockData = { ...mockTopologyData, vpcs: [] };
    render(<InfrastructureTopology />);
    expect(
      screen.getByText("No Terraform-managed infrastructure found"),
    ).toBeInTheDocument();
  });

  it("renders empty state when data is null", () => {
    mockData = null;
    render(<InfrastructureTopology />);
    expect(
      screen.getByText("No Terraform-managed infrastructure found"),
    ).toBeInTheDocument();
  });

  it("renders refresh button in empty state", () => {
    mockData = { ...mockTopologyData, vpcs: [] };
    render(<InfrastructureTopology />);
    expect(screen.getByText("Refresh Data")).toBeInTheDocument();
  });

  it("calls refresh when refresh button is clicked", async () => {
    mockData = { ...mockTopologyData, vpcs: [] };
    render(<InfrastructureTopology />);
    fireEvent.click(screen.getByText("Refresh Data"));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(false);
    });
  });

  it("renders topology canvas when data is available", () => {
    render(<InfrastructureTopology />);
    expect(screen.getByTestId("topology-canvas")).toBeInTheDocument();
  });

  it("renders topology legend when data is available", () => {
    render(<InfrastructureTopology />);
    expect(screen.getByTestId("topology-legend")).toBeInTheDocument();
  });

  it("calls onResourceSelect when node is clicked", () => {
    const mockOnResourceSelect = vi.fn();
    render(<InfrastructureTopology onResourceSelect={mockOnResourceSelect} />);

    fireEvent.click(screen.getByTestId("test-node"));
    expect(mockOnResourceSelect).toHaveBeenCalledWith({
      label: "Test Node",
      type: "ec2",
    });
  });

  it("handles undefined onResourceSelect gracefully", () => {
    render(<InfrastructureTopology />);
    // Should not throw when clicking without onResourceSelect
    expect(() =>
      fireEvent.click(screen.getByTestId("test-node")),
    ).not.toThrow();
  });
});
