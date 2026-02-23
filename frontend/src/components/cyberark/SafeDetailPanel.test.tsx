import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { SafeDetailPanel } from "./SafeDetailPanel";

// =============================================================================
// Mock hooks
// =============================================================================

let mockSafe: Record<string, unknown> | null = null;
let mockIsLoading = false;

vi.mock("@/hooks", () => ({
  useCyberArkSafe: () => ({
    data: mockSafe,
    isLoading: mockIsLoading,
  }),
}));

describe("SafeDetailPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockSafe = {
      safe_name: "AdminSafe",
      description: "Admin safe",
      number_of_members: 3,
      number_of_accounts: 5,
      tf_managed: true,
      tf_state_source: "s3://bucket/state.tfstate",
      tf_resource_address: "cyberark_safe.admin",
      updated_at: "2024-01-15T12:00:00Z",
      created_at: "2024-01-01T00:00:00Z",
      members: [
        {
          id: 1,
          member_name: "admin@corp.com",
          member_type: "user",
          permission_level: "Full",
        },
      ],
      accounts: [
        {
          account_id: "acc-1",
          account_name: "root-account",
          address: "10.0.1.5",
          platform_id: "UnixSSH",
        },
      ],
    };
  });

  it("renders Safe Details heading", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Safe Details")).toBeInTheDocument();
  });

  it("renders safe name", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    // Safe name appears in heading and DetailRow
    const matches = screen.getAllByText("AdminSafe");
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders basic info section", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("Admin safe")).toBeInTheDocument();
  });

  it("renders member count in detail row", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders members table", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Members (1)")).toBeInTheDocument();
    expect(screen.getByText("admin@corp.com")).toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });

  it("renders accounts table", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Accounts (1)")).toBeInTheDocument();
    expect(screen.getByText("root-account")).toBeInTheDocument();
    expect(screen.getByText("10.0.1.5")).toBeInTheDocument();
    expect(screen.getByText("UnixSSH")).toBeInTheDocument();
  });

  it("renders terraform section when tf_managed", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Terraform")).toBeInTheDocument();
    expect(screen.getByText("s3://bucket/state.tfstate")).toBeInTheDocument();
  });

  it("renders timestamps section", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    expect(screen.getByText("Timestamps")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
    expect(screen.getByText("Created")).toBeInTheDocument();
  });

  it("shows loading spinner", () => {
    mockIsLoading = true;
    mockSafe = null;
    const { container } = render(
      <SafeDetailPanel safeName="AdminSafe" onClose={onClose} />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows not found message when safe is null", () => {
    mockSafe = null;
    render(<SafeDetailPanel safeName="Unknown" onClose={onClose} />);
    expect(screen.getByText("Safe not found.")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<SafeDetailPanel safeName="AdminSafe" onClose={onClose} />);
    const closeButtons = screen.getAllByRole("button");
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
