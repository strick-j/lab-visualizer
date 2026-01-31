import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { IGWDetailPanel } from "./IGWDetailPanel";

const mockIGW = {
  id: 1,
  igw_id: "igw-123456",
  name: "Main IGW",
  vpc_id: "vpc-123",
  display_status: "active" as const,
  state: "attached",
  region_name: "us-east-1",
  tf_managed: true,
  tf_state_source: "prod/terraform.tfstate",
  tf_resource_address: "aws_internet_gateway.main",
  updated_at: "2024-01-15T12:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
  is_deleted: false,
  deleted_at: null,
  tags: { Environment: "production" },
};

describe("IGWDetailPanel", () => {
  const mockOnClose = vi.fn();

  it("renders panel header", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("Internet Gateway Details")).toBeInTheDocument();
  });

  it("renders IGW name", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("Main IGW")).toBeInTheDocument();
  });

  it("renders IGW ID", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("igw-123456")).toBeInTheDocument();
  });

  it("renders VPC ID when attached", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("vpc-123")).toBeInTheDocument();
  });

  it("renders state", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("attached")).toBeInTheDocument();
  });

  it("renders region", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("us-east-1")).toBeInTheDocument();
  });

  it("renders terraform section when managed", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("prod/terraform.tfstate")).toBeInTheDocument();
    expect(screen.getByText("aws_internet_gateway.main")).toBeInTheDocument();
  });

  it("renders tags", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    expect(screen.getByText("Environment")).toBeInTheDocument();
    expect(screen.getByText("production")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    render(<IGWDetailPanel igw={mockIGW} onClose={mockOnClose} />);
    const closeButtons = screen.getAllByRole("button");
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows Detached when no VPC is attached", () => {
    const detachedIGW = { ...mockIGW, vpc_id: null };
    render(<IGWDetailPanel igw={detachedIGW} onClose={mockOnClose} />);
    expect(screen.getByText("Detached")).toBeInTheDocument();
  });

  it("does not show terraform section when not managed", () => {
    const unmanagedIGW = { ...mockIGW, tf_managed: false };
    render(<IGWDetailPanel igw={unmanagedIGW} onClose={mockOnClose} />);
    expect(
      screen.queryByText("prod/terraform.tfstate"),
    ).not.toBeInTheDocument();
  });
});
