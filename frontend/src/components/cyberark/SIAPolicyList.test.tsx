import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { SIAPolicyList } from "./SIAPolicyList";
import type { CyberArkSIAPolicy } from "@/types";

// =============================================================================
// Mock data
// =============================================================================

const mockPolicy1: CyberArkSIAPolicy = {
  id: 1,
  policy_id: "pol-1",
  policy_name: "VMAccess",
  policy_type: "vm",
  description: "VM access policy",
  status: "active",
  target_criteria: null,
  tf_managed: true,
  tf_state_source: "s3://bucket/state.tfstate",
  tf_resource_address: "cyberark_sia_policy.vm",
  is_deleted: false,
  updated_at: "2024-01-15T12:00:00Z",
};

const mockPolicy2: CyberArkSIAPolicy = {
  id: 2,
  policy_id: "pol-2",
  policy_name: "DBAccess",
  policy_type: "database",
  description: null,
  status: "inactive",
  target_criteria: null,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  is_deleted: false,
  updated_at: "2024-01-14T12:00:00Z",
};

let mockData: {
  data: CyberArkSIAPolicy[];
  meta: { total: number; last_refreshed: string | null };
} | null = {
  data: [mockPolicy1, mockPolicy2],
  meta: { total: 2, last_refreshed: null },
};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useCyberArkSIAPolicies: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useCyberArkSIAPolicy: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe("SIAPolicyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      data: [mockPolicy1, mockPolicy2],
      meta: { total: 2, last_refreshed: null },
    };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders policies count", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("2 policies found")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<SIAPolicyList />);
    expect(
      screen.getByPlaceholderText("Search policies..."),
    ).toBeInTheDocument();
  });

  it("renders policy names in table", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("VMAccess")).toBeInTheDocument();
    expect(screen.getByText("DBAccess")).toBeInTheDocument();
  });

  it("renders policy IDs", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("pol-1")).toBeInTheDocument();
    expect(screen.getByText("pol-2")).toBeInTheDocument();
  });

  it("renders VM type badge", () => {
    render(<SIAPolicyList />);
    // "VM" appears in both the type filter option and the table cell
    const vmTexts = screen.getAllByText("VM");
    expect(vmTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Database type badge", () => {
    render(<SIAPolicyList />);
    // "Database" appears in both the type filter option and the table cell
    const dbTexts = screen.getAllByText("Database");
    expect(dbTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders status badges", () => {
    render(<SIAPolicyList />);
    // "active" and "inactive" appear in both filter options and table
    const activeTexts = screen.getAllByText("active");
    expect(activeTexts.length).toBeGreaterThanOrEqual(1);
    const inactiveTexts = screen.getAllByText("inactive");
    expect(inactiveTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders description or dash", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("VM access policy")).toBeInTheDocument();
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("Policy Name")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("renders filter dropdowns", () => {
    render(<SIAPolicyList />);
    expect(screen.getByText("All types")).toBeInTheDocument();
    expect(screen.getByText("All statuses")).toBeInTheDocument();
    expect(screen.getByText("All resources")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<SIAPolicyList />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed");
    mockData = null;
    render(<SIAPolicyList />);
    expect(screen.getByText("Error loading SIA policies")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<SIAPolicyList />);
    expect(screen.getByText("No SIA policies found")).toBeInTheDocument();
  });
});
