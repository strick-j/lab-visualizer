import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TopologyLegend } from "./TopologyLegend";

describe("TopologyLegend", () => {
  const mockStats = {
    total_vpcs: 2,
    total_subnets: 6,
    total_ec2: 10,
    total_rds: 3,
  };

  it("renders the legend header", () => {
    render(<TopologyLegend />);
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("renders stats when provided", () => {
    render(<TopologyLegend stats={mockStats} />);
    expect(screen.getByText("VPCs:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Subnets:")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("EC2:")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("RDS:")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not render stats section when stats not provided", () => {
    render(<TopologyLegend />);
    expect(screen.queryByText("VPCs:")).not.toBeInTheDocument();
  });

  it("expands legend content when clicked", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");
    fireEvent.click(legendButton);

    // Should show resource types
    expect(screen.getByText("VPC")).toBeInTheDocument();
    expect(screen.getByText("Subnet")).toBeInTheDocument();
    expect(screen.getByText("EC2 Instance")).toBeInTheDocument();
    expect(screen.getByText("RDS Database")).toBeInTheDocument();
    expect(screen.getByText("Internet Gateway")).toBeInTheDocument();
    expect(screen.getByText("NAT Gateway")).toBeInTheDocument();
  });

  it("shows status indicators when expanded", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");
    fireEvent.click(legendButton);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Transit")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows subnet types when expanded", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");
    fireEvent.click(legendButton);

    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("shows terraform managed indicator when expanded", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");
    fireEvent.click(legendButton);

    expect(screen.getByText("TF")).toBeInTheDocument();
    expect(screen.getByText("Terraform Managed")).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");

    // Expand
    fireEvent.click(legendButton);
    expect(screen.getByText("VPC")).toBeInTheDocument();

    // Collapse
    fireEvent.click(legendButton);
    // The content should be hidden (opacity-0)
    const legendContent = screen
      .getByText("VPC")
      .closest(".space-y-4")?.parentElement;
    expect(legendContent?.className).toContain("max-h-0");
    expect(legendContent?.className).toContain("opacity-0");
  });

  it("shows section headers when expanded", () => {
    render(<TopologyLegend />);
    const legendButton = screen.getByText("Legend");
    fireEvent.click(legendButton);

    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Subnet Types")).toBeInTheDocument();
  });
});
