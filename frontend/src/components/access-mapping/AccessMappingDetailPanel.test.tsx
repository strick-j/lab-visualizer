import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { AccessMappingDetailPanel } from "./AccessMappingDetailPanel";

// =============================================================================
// Mock hooks
// =============================================================================

let mockEC2Instance: Record<string, unknown> | null = null;
let mockEC2Loading = false;
let mockRDSInstance: Record<string, unknown> | null = null;
let mockRDSLoading = false;

vi.mock("@/hooks", () => ({
  useEC2Instance: () => ({
    data: mockEC2Instance,
    isLoading: mockEC2Loading,
  }),
  useRDSInstance: () => ({
    data: mockRDSInstance,
    isLoading: mockRDSLoading,
  }),
}));

describe("AccessMappingDetailPanel", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEC2Instance = null;
    mockEC2Loading = false;
    mockRDSInstance = null;
    mockRDSLoading = false;
  });

  it("renders account detail panel for access-account type", () => {
    render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-account",
          nodeData: {
            accountName: "root-account",
            accountId: "acc-1",
            safeName: "AdminSafe",
            address: "10.0.1.5",
            platformId: "UnixSSH",
            secretType: "password",
            username: "root",
          },
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Account Details")).toBeInTheDocument();
    // "root-account" appears in heading + DetailRow
    const accountTexts = screen.getAllByText("root-account");
    expect(accountTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("acc-1")).toBeInTheDocument();
    expect(screen.getByText("AdminSafe")).toBeInTheDocument();
    expect(screen.getByText("10.0.1.5")).toBeInTheDocument();
    expect(screen.getByText("UnixSSH")).toBeInTheDocument();
  });

  it("renders EC2 loading state for ec2-target type", () => {
    mockEC2Loading = true;
    const { container } = render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-ec2-target",
          nodeData: { instanceId: "i-123" },
        }}
        onClose={onClose}
      />,
    );
    expect(
      container.querySelector(".animate-spin") ||
        screen.getByText("Loading instance details..."),
    ).toBeTruthy();
  });

  it("renders EC2 not found when instance is null", () => {
    mockEC2Instance = null;
    mockEC2Loading = false;
    render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-ec2-target",
          nodeData: { instanceId: "i-123" },
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/Instance not found/)).toBeInTheDocument();
  });

  it("renders RDS loading state", () => {
    mockRDSLoading = true;
    render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-rds-target",
          nodeData: { dbIdentifier: "mydb" },
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("Loading database details...")).toBeInTheDocument();
  });

  it("renders RDS not found when instance is null", () => {
    mockRDSInstance = null;
    mockRDSLoading = false;
    render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-rds-target",
          nodeData: { dbIdentifier: "mydb" },
        }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/Database not found/)).toBeInTheDocument();
  });

  it("returns null for unknown node type", () => {
    const { container } = render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "unknown",
          nodeData: {},
        }}
        onClose={onClose}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders terraform section for tf-managed account", () => {
    render(
      <AccessMappingDetailPanel
        selectedNode={{
          nodeType: "access-account",
          nodeData: {
            accountName: "tf-account",
            tfManaged: true,
            tfStateSource: "s3://bucket/state",
            tfResourceAddress: "cyberark_account.x",
          },
        }}
        onClose={onClose}
      />,
    );
    // "Terraform" appears in the section header and TerraformBadge
    const tfTexts = screen.getAllByText(/Terraform/i);
    expect(tfTexts.length).toBeGreaterThanOrEqual(1);
  });
});
