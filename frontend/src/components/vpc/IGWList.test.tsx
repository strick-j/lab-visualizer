import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { IGWList } from "./IGWList";

const mockIGWs = [
  {
    igw_id: "igw-123",
    name: "Main IGW",
    vpc_id: "vpc-123",
    display_status: "active" as const,
    state: "attached",
    tf_managed: true,
    updated_at: "2024-01-15T12:00:00Z",
  },
  {
    igw_id: "igw-456",
    name: "Secondary IGW",
    vpc_id: null,
    display_status: "inactive" as const,
    state: "detached",
    tf_managed: false,
    updated_at: "2024-01-14T12:00:00Z",
  },
];

let mockData = { data: mockIGWs, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useInternetGateways: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("IGWList", () => {
  const mockOnFilterChange = vi.fn();
  const defaultProps = {
    filters: {},
    onFilterChange: mockOnFilterChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockIGWs, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders IGW count", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("2 Internet Gateways found")).toBeInTheDocument();
  });

  it("renders IGW names", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("Main IGW")).toBeInTheDocument();
    expect(screen.getByText("Secondary IGW")).toBeInTheDocument();
  });

  it("renders IGW IDs", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("igw-123")).toBeInTheDocument();
    expect(screen.getByText("igw-456")).toBeInTheDocument();
  });

  it("renders VPC ID when attached", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("vpc-123")).toBeInTheDocument();
  });

  it("renders Detached when no VPC", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("Detached")).toBeInTheDocument();
  });

  it("renders state", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("attached")).toBeInTheDocument();
    expect(screen.getByText("detached")).toBeInTheDocument();
  });

  it("renders terraform badges", () => {
    render(<IGWList {...defaultProps} />);
    const managedBadges = screen.getAllByText("Managed");
    const unmanagedBadges = screen.getAllByText("Unmanaged");
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("State")).toBeInTheDocument();
    expect(screen.getByText("VPC")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<IGWList {...defaultProps} />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed to fetch");
    mockData = null as unknown as typeof mockData;
    render(<IGWList {...defaultProps} />);
    expect(
      screen.getByText("Error loading Internet Gateways"),
    ).toBeInTheDocument();
  });

  it("shows empty state when no IGWs", () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<IGWList {...defaultProps} />);
    expect(screen.getByText("No Internet Gateways found")).toBeInTheDocument();
  });

  it("renders resource filters", () => {
    render(<IGWList {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Search by name or ID..."),
    ).toBeInTheDocument();
  });
});
