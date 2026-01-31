import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TerraformPage } from "./Terraform";

const mockStates = [
  {
    name: "production",
    key: "prod/terraform.tfstate",
    resource_count: 25,
    status: "synced",
    last_modified: "2024-01-15T12:00:00Z",
    description: "Production infrastructure",
  },
  {
    name: "development",
    key: "dev/terraform.tfstate",
    resource_count: 10,
    status: "synced",
    last_modified: "2024-01-14T12:00:00Z",
  },
];

const mockDriftItems = [
  {
    resource_id: "i-123456",
    resource_type: "aws_instance",
    drift_type: "unmanaged" as const,
    details: "Instance not in Terraform state",
  },
  {
    resource_id: "sg-789012",
    resource_type: "aws_security_group",
    drift_type: "orphaned" as const,
    details: "Security group deleted from AWS",
  },
];

let mockStatesData: {
  states: typeof mockStates;
  total_tf_managed_resources: number;
} | null = {
  states: mockStates,
  total_tf_managed_resources: 35,
};
let mockStatesLoading = false;
let mockStatesError: Error | null = null;

let mockDriftData: {
  drift_detected: boolean;
  items: typeof mockDriftItems;
  checked_at: string;
} | null = {
  drift_detected: true,
  items: mockDriftItems,
  checked_at: "2024-01-15T12:00:00Z",
};
let mockDriftLoading = false;
const mockRefetchDrift = vi.fn();

vi.mock("@/hooks", () => ({
  useTerraformStates: () => ({
    data: mockStatesData,
    isLoading: mockStatesLoading,
    error: mockStatesError,
  }),
  useDrift: () => ({
    data: mockDriftData,
    isLoading: mockDriftLoading,
    refetch: mockRefetchDrift,
  }),
}));

describe("TerraformPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatesData = { states: mockStates, total_tf_managed_resources: 35 };
    mockStatesLoading = false;
    mockStatesError = null;
    mockDriftData = {
      drift_detected: true,
      items: mockDriftItems,
      checked_at: "2024-01-15T12:00:00Z",
    };
    mockDriftLoading = false;
  });

  it("renders page title", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("renders page description", () => {
    render(<TerraformPage />);
    expect(
      screen.getByText("Manage and monitor your Terraform state files"),
    ).toBeInTheDocument();
  });

  it("renders state files count", () => {
    render(<TerraformPage />);
    // There's a card header and a card title both with "State Files"
    const stateFilesElements = screen.getAllByText("State Files");
    expect(stateFilesElements.length).toBeGreaterThan(0);
  });

  it("renders managed resources count", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Managed Resources")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("renders drift items count", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Drift Items")).toBeInTheDocument();
  });

  it("renders state file names", () => {
    render(<TerraformPage />);
    expect(screen.getByText("production")).toBeInTheDocument();
    expect(screen.getByText("development")).toBeInTheDocument();
  });

  it("renders state file keys", () => {
    render(<TerraformPage />);
    expect(screen.getByText("prod/terraform.tfstate")).toBeInTheDocument();
    expect(screen.getByText("dev/terraform.tfstate")).toBeInTheDocument();
  });

  it("renders resource counts", () => {
    render(<TerraformPage />);
    expect(screen.getByText("25 resources")).toBeInTheDocument();
    expect(screen.getByText("10 resources")).toBeInTheDocument();
  });

  it("renders state file description when available", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Production infrastructure")).toBeInTheDocument();
  });

  it("renders drift detection section", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Drift Detection")).toBeInTheDocument();
  });

  it("renders Check Drift button", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Check Drift")).toBeInTheDocument();
  });

  it("calls refetch when Check Drift is clicked", () => {
    render(<TerraformPage />);
    const button = screen.getByText("Check Drift");
    fireEvent.click(button);
    expect(mockRefetchDrift).toHaveBeenCalled();
  });

  it("renders drift items when drift is detected", () => {
    render(<TerraformPage />);
    expect(screen.getByText("i-123456")).toBeInTheDocument();
    expect(screen.getByText("sg-789012")).toBeInTheDocument();
    expect(screen.getByText("aws_instance")).toBeInTheDocument();
    expect(screen.getByText("aws_security_group")).toBeInTheDocument();
  });

  it("renders drift type labels", () => {
    render(<TerraformPage />);
    expect(screen.getByText("Unmanaged")).toBeInTheDocument();
    expect(screen.getByText("Orphaned")).toBeInTheDocument();
  });

  it("shows no drift message when no drift items", () => {
    mockDriftData = {
      drift_detected: false,
      items: [],
      checked_at: "2024-01-15T12:00:00Z",
    };
    render(<TerraformPage />);
    expect(screen.getByText("No drift detected")).toBeInTheDocument();
  });

  it("shows check drift message when no drift data", () => {
    mockDriftData = null;
    render(<TerraformPage />);
    expect(
      screen.getByText('Click "Check Drift" to detect configuration drift'),
    ).toBeInTheDocument();
  });

  it("shows loading state when states are loading", () => {
    mockStatesLoading = true;
    mockStatesData = null;
    const { container } = render(<TerraformPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state when states fail to load", () => {
    mockStatesError = new Error("Failed to fetch");
    mockStatesData = null;
    render(<TerraformPage />);
    expect(
      screen.getByText("Error loading Terraform states"),
    ).toBeInTheDocument();
  });

  it("shows no state files message when empty", () => {
    mockStatesData = { states: [], total_tf_managed_resources: 0 };
    render(<TerraformPage />);
    expect(screen.getByText("No state files configured")).toBeInTheDocument();
  });
});
