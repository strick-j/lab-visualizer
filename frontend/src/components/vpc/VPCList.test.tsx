import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { VPCList } from "./VPCList";

const mockVPCs = [
  {
    vpc_id: "vpc-123",
    name: "Production VPC",
    cidr_block: "10.0.0.0/16",
    display_status: "active" as const,
    is_default: false,
    enable_dns_support: true,
    enable_dns_hostnames: true,
    tf_managed: true,
    state: "available",
    instance_tenancy: "default",
    updated_at: "2024-01-15T12:00:00Z",
  },
  {
    vpc_id: "vpc-456",
    name: "Development VPC",
    cidr_block: "172.16.0.0/16",
    display_status: "active" as const,
    is_default: true,
    enable_dns_support: false,
    enable_dns_hostnames: false,
    tf_managed: false,
    state: "available",
    instance_tenancy: "default",
    updated_at: "2024-01-14T12:00:00Z",
  },
];

let mockData = { data: mockVPCs, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useVPCs: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("VPCList", () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockVPCs, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders VPC count", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("2 VPCs found")).toBeInTheDocument();
  });

  it("renders VPC names", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("Production VPC")).toBeInTheDocument();
    expect(screen.getByText("Development VPC")).toBeInTheDocument();
  });

  it("renders VPC IDs", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("vpc-123")).toBeInTheDocument();
    expect(screen.getByText("vpc-456")).toBeInTheDocument();
  });

  it("renders CIDR blocks", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("10.0.0.0/16")).toBeInTheDocument();
    expect(screen.getByText("172.16.0.0/16")).toBeInTheDocument();
  });

  it("renders default VPC indicator", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders DNS settings", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("✓ DNS Support")).toBeInTheDocument();
    expect(screen.getByText("✓ DNS Hostnames")).toBeInTheDocument();
  });

  it("renders terraform badges", () => {
    render(<VPCList {...defaultProps} />);
    const managedBadges = screen.getAllByText("Managed");
    const unmanagedBadges = screen.getAllByText("Unmanaged");
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("CIDR Block")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText("DNS")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<VPCList {...defaultProps} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed to fetch");
    mockData = null as unknown as typeof mockData;
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("Error loading VPCs")).toBeInTheDocument();
  });

  it("shows empty state when no VPCs", () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<VPCList {...defaultProps} />);
    expect(screen.getByText("No VPCs found")).toBeInTheDocument();
  });

  it("renders resource filters", () => {
    render(<VPCList {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search by name or ID..."),
    ).toBeInTheDocument();
  });
});
