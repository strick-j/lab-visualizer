import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { RoleDetailPanel } from "./RoleDetailPanel";

// =============================================================================
// Mock hooks
// =============================================================================

let mockRole: Record<string, unknown> | null = null;
let mockIsLoading = false;

vi.mock("@/hooks", () => ({
  useCyberArkRole: () => ({
    data: mockRole,
    isLoading: mockIsLoading,
  }),
}));

describe("RoleDetailPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockRole = {
      role_id: "role-1",
      role_name: "Admin",
      description: "Administrator role",
      tf_managed: true,
      tf_state_source: "s3://bucket/state.tfstate",
      tf_resource_address: "cyberark_role.admin",
      updated_at: "2024-01-15T12:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      members: [{ id: 1, member_name: "john@corp.com", member_type: "user" }],
    };
  });

  it("renders Role Details heading", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    expect(screen.getByText("Role Details")).toBeInTheDocument();
  });

  it("renders role name", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    // Role name appears in heading and DetailRow
    const matches = screen.getAllByText("Admin");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders basic info section", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("role-1")).toBeInTheDocument();
    expect(screen.getByText("Administrator role")).toBeInTheDocument();
  });

  it("renders members table", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    expect(screen.getByText("Members (1)")).toBeInTheDocument();
    expect(screen.getByText("john@corp.com")).toBeInTheDocument();
  });

  it("renders terraform section when tf_managed", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("renders timestamps", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    expect(screen.getByText("Timestamps")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    mockIsLoading = true;
    mockRole = null;
    const { container } = render(
      <RoleDetailPanel roleId="role-1" onClose={onClose} />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows not found message when role is null", () => {
    mockRole = null;
    render(<RoleDetailPanel roleId="unknown" onClose={onClose} />);
    expect(screen.getByText("Role not found.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<RoleDetailPanel roleId="role-1" onClose={onClose} />);
    const closeButtons = screen.getAllByRole("button");
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
