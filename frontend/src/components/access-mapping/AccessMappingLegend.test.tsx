import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { AccessMappingLegend } from "./AccessMappingLegend";

describe("AccessMappingLegend", () => {
  const stats = {
    total_users: 5,
    total_targets: 10,
    total_standing_paths: 8,
    total_jit_paths: 3,
  };

  it("renders stats when provided", () => {
    render(<AccessMappingLegend stats={stats} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders stat labels", () => {
    render(<AccessMappingLegend stats={stats} />);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Targets")).toBeInTheDocument();
    expect(screen.getByText("Standing")).toBeInTheDocument();
    expect(screen.getByText("JIT")).toBeInTheDocument();
  });

  it("does not render stats when null", () => {
    render(<AccessMappingLegend stats={null} />);
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Targets")).not.toBeInTheDocument();
  });

  it("renders Legend toggle button", () => {
    render(<AccessMappingLegend stats={stats} />);
    expect(screen.getByText("Legend")).toBeInTheDocument();
  });

  it("legend content hidden by default", () => {
    render(<AccessMappingLegend stats={stats} />);
    expect(screen.queryByText("Nodes")).not.toBeInTheDocument();
  });

  it("expands legend on click", () => {
    render(<AccessMappingLegend stats={stats} />);
    fireEvent.click(screen.getByText("Legend"));
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    expect(screen.getByText("Connections")).toBeInTheDocument();
  });

  it("shows node type labels when expanded", () => {
    render(<AccessMappingLegend stats={stats} />);
    fireEvent.click(screen.getByText("Legend"));
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("SIA Policy")).toBeInTheDocument();
    expect(screen.getByText("EC2 Target")).toBeInTheDocument();
    expect(screen.getByText("RDS Target")).toBeInTheDocument();
  });

  it("shows connection types when expanded", () => {
    render(<AccessMappingLegend stats={stats} />);
    fireEvent.click(screen.getByText("Legend"));
    expect(screen.getByText("Standing Access")).toBeInTheDocument();
    expect(screen.getByText("JIT Access")).toBeInTheDocument();
  });

  it("collapses legend on second click", () => {
    render(<AccessMappingLegend stats={stats} />);
    fireEvent.click(screen.getByText("Legend"));
    expect(screen.getByText("Nodes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Legend"));
    expect(screen.queryByText("Nodes")).not.toBeInTheDocument();
  });
});
