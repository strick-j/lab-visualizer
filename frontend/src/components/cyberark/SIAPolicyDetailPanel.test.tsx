import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { SIAPolicyDetailPanel } from "./SIAPolicyDetailPanel";

// =============================================================================
// Mock hooks
// =============================================================================

let mockPolicy: Record<string, unknown> | null = null;
let mockIsLoading = false;

vi.mock("@/hooks", () => ({
  useCyberArkSIAPolicy: () => ({
    data: mockPolicy,
    isLoading: mockIsLoading,
  }),
}));

describe("SIAPolicyDetailPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockPolicy = {
      policy_id: "pol-1",
      policy_name: "VMAccess",
      policy_type: "vm",
      description: "VM access policy",
      status: "active",
      tf_managed: true,
      tf_state_source: "s3://bucket/state.tfstate",
      tf_resource_address: "cyberark_sia_policy.vm",
      updated_at: "2024-01-15T12:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      target_criteria: { regions: ["us-east-1"], tags: { env: ["prod"] } },
      principals: [
        {
          id: 1,
          principal_name: "admin@corp.com",
          principal_type: "user",
        },
      ],
    };
  });

  it("renders SIA Policy Details heading", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("SIA Policy Details")).toBeInTheDocument();
  });

  it("renders policy name", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    // Policy name appears in heading and DetailRow
    const matches = screen.getAllByText("VMAccess");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders VM type badge", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("VM")).toBeInTheDocument();
  });

  it("renders Database type badge for database policies", () => {
    mockPolicy = {
      ...mockPolicy,
      policy_type: "database",
      principals: [],
      target_criteria: null,
    };
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("Database")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    // "active" appears in the badge
    const activeTexts = screen.getAllByText("active");
    expect(activeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders basic info section", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("pol-1")).toBeInTheDocument();
    expect(screen.getByText("VM access policy")).toBeInTheDocument();
  });

  it("renders target criteria section", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("Target Criteria")).toBeInTheDocument();
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
    expect(screen.getByText("env: prod")).toBeInTheDocument();
  });

  it("renders principals table", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("Principals (1)")).toBeInTheDocument();
    expect(screen.getByText("admin@corp.com")).toBeInTheDocument();
  });

  it("renders terraform section when tf_managed", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    // "Terraform" appears in the section header
    const tfTexts = screen.getAllByText("Terraform");
    expect(tfTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders timestamps", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    expect(screen.getByText("Timestamps")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    mockIsLoading = true;
    mockPolicy = null;
    const { container } = render(
      <SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows not found message when policy is null", () => {
    mockPolicy = null;
    render(<SIAPolicyDetailPanel policyId="unknown" onClose={onClose} />);
    expect(screen.getByText("Policy not found.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<SIAPolicyDetailPanel policyId="pol-1" onClose={onClose} />);
    const closeButtons = screen.getAllByRole("button");
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
