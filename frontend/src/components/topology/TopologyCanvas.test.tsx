import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TopologyCanvas } from "./TopologyCanvas";
import type { TopologyResponse } from "@/types/topology";

// Mock interfaces for ReactFlow
interface MockReactFlowProps {
  children?: React.ReactNode;
  nodes?: unknown[];
  edges?: unknown[];
  onNodeClick?: (
    event: React.MouseEvent,
    node: { id: string; type: string; data: { label: string } },
  ) => void;
}

interface MockNode {
  id: string;
  position: { x: number; y: number };
  data: unknown;
}

// Mock ReactFlow and related imports
vi.mock("reactflow", () => ({
  default: ({ children, nodes, edges, onNodeClick }: MockReactFlowProps) => (
    <div
      data-testid="react-flow"
      data-nodes={JSON.stringify(nodes)}
      data-edges={JSON.stringify(edges)}
    >
      <button
        data-testid="mock-node"
        onClick={(e) =>
          onNodeClick?.(e, {
            id: "node-1",
            type: "ec2",
            data: { label: "test" },
          })
        }
      >
        Mock Node
      </button>
      {children}
    </div>
  ),
  Background: () => <div data-testid="react-flow-background" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useNodesState: (initialNodes: MockNode[]) => [initialNodes, vi.fn(), vi.fn()],
  useEdgesState: (
    initialEdges: { id: string; source: string; target: string }[],
  ) => [initialEdges, vi.fn(), vi.fn()],
  useReactFlow: () => ({ fitView: vi.fn() }),
  BackgroundVariant: { Dots: "dots" },
}));

// Mock the layout calculator
vi.mock("./utils/layoutCalculator", () => ({
  calculateTopologyLayout: () => ({
    nodes: [
      {
        id: "vpc-1",
        type: "vpc",
        position: { x: 0, y: 0 },
        data: { label: "Test VPC" },
      },
      {
        id: "subnet-1",
        type: "subnet",
        position: { x: 10, y: 10 },
        data: { label: "Test Subnet" },
      },
    ],
    edges: [],
  }),
  createEdges: () => [{ id: "edge-1", source: "vpc-1", target: "subnet-1" }],
}));

const mockTopologyData: TopologyResponse = {
  vpcs: [
    {
      id: "vpc-123",
      name: "Test VPC",
      cidr_block: "10.0.0.0/16",
      state: "available",
      display_status: "active",
      tf_managed: true,
      tf_resource_address: null,
      internet_gateway: null,
      elastic_ips: [],
      subnets: [
        {
          id: "subnet-123",
          name: "Test Subnet",
          cidr_block: "10.0.1.0/24",
          availability_zone: "us-east-1a",
          subnet_type: "public",
          display_status: "active",
          tf_managed: true,
          tf_resource_address: null,
          nat_gateway: null,
          ec2_instances: [],
          rds_instances: [],
          ecs_containers: [],
        },
      ],
    },
  ],
  meta: {
    total_vpcs: 1,
    total_subnets: 1,
    total_ec2: 0,
    total_rds: 0,
    total_ecs_containers: 0,
    total_nat_gateways: 0,
    total_internet_gateways: 0,
    total_elastic_ips: 0,
    last_refreshed: "2024-01-15T12:00:00Z",
  },
};

describe("TopologyCanvas", () => {
  it("renders ReactFlow component", () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId("react-flow")).toBeInTheDocument();
  });

  it("renders ReactFlow background", () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId("react-flow-background")).toBeInTheDocument();
  });

  it("renders ReactFlow controls", () => {
    render(<TopologyCanvas data={mockTopologyData} />);
    expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
  });

  it("calls onNodeClick when node is clicked", () => {
    const mockOnNodeClick = vi.fn();
    render(
      <TopologyCanvas data={mockTopologyData} onNodeClick={mockOnNodeClick} />,
    );

    const mockNode = screen.getByTestId("mock-node");
    fireEvent.click(mockNode);

    expect(mockOnNodeClick).toHaveBeenCalledWith("node-1", "ec2", {
      label: "test",
    });
  });

  it("does not throw when onNodeClick is not provided", () => {
    render(<TopologyCanvas data={mockTopologyData} />);

    const mockNode = screen.getByTestId("mock-node");
    expect(() => fireEvent.click(mockNode)).not.toThrow();
  });

  it("renders within a container div", () => {
    const { container } = render(<TopologyCanvas data={mockTopologyData} />);
    const wrapperDiv = container.querySelector(".w-full.h-full");
    expect(wrapperDiv).toBeInTheDocument();
  });
});
