import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { SubnetList } from "./SubnetList";

const mockSubnets = [
  {
    subnet_id: "subnet-123",
    vpc_id: "vpc-123",
    name: "Public Subnet 1",
    cidr_block: "10.0.1.0/24",
    availability_zone: "us-east-1a",
    subnet_type: "public" as const,
    display_status: "active" as const,
    available_ip_count: 251,
    tf_managed: true,
    state: "available",
    map_public_ip_on_launch: true,
    default_for_az: false,
    updated_at: "2024-01-15T12:00:00Z",
  },
  {
    subnet_id: "subnet-456",
    vpc_id: "vpc-123",
    name: "Private Subnet 1",
    cidr_block: "10.0.2.0/24",
    availability_zone: "us-east-1b",
    subnet_type: "private" as const,
    display_status: "active" as const,
    available_ip_count: 250,
    tf_managed: false,
    state: "available",
    map_public_ip_on_launch: false,
    default_for_az: false,
    updated_at: "2024-01-14T12:00:00Z",
  },
];

let mockData = { data: mockSubnets, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useSubnets: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("SubnetList", () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockSubnets, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders subnet count", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("2 Subnets found")).toBeInTheDocument();
  });

  it("renders subnet names", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("Public Subnet 1")).toBeInTheDocument();
    expect(screen.getByText("Private Subnet 1")).toBeInTheDocument();
  });

  it("renders subnet IDs", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("subnet-123")).toBeInTheDocument();
    expect(screen.getByText("subnet-456")).toBeInTheDocument();
  });

  it("renders CIDR blocks", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("10.0.1.0/24")).toBeInTheDocument();
    expect(screen.getByText("10.0.2.0/24")).toBeInTheDocument();
  });

  it("renders VPC IDs", () => {
    render(<SubnetList {...defaultProps} />);
    const vpcIds = screen.getAllByText("vpc-123");
    expect(vpcIds.length).toBe(2);
  });

  it("renders availability zones", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("us-east-1a")).toBeInTheDocument();
    expect(screen.getByText("us-east-1b")).toBeInTheDocument();
  });

  it("renders available IP count", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("251")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("renders subnet type badges", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("renders terraform badges", () => {
    render(<SubnetList {...defaultProps} />);
    const managedBadges = screen.getAllByText("Managed");
    const unmanagedBadges = screen.getAllByText("Unmanaged");
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("CIDR Block")).toBeInTheDocument();
    expect(screen.getByText("VPC")).toBeInTheDocument();
    expect(screen.getByText("Availability Zone")).toBeInTheDocument();
    expect(screen.getByText("Available IPs")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<SubnetList {...defaultProps} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed to fetch");
    mockData = null as unknown as typeof mockData;
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("Error loading Subnets")).toBeInTheDocument();
  });

  it("shows empty state when no subnets", () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<SubnetList {...defaultProps} />);
    expect(screen.getByText("No Subnets found")).toBeInTheDocument();
  });

  it("renders resource filters", () => {
    render(<SubnetList {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search by name or ID..."),
    ).toBeInTheDocument();
  });
});
