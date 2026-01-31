import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock all pages to simplify testing
vi.mock("@/pages", () => ({
  DashboardPage: () => (
    <div data-testid="dashboard-page">Dashboard Content</div>
  ),
  EC2ListPage: () => <div data-testid="ec2-page">EC2 Content</div>,
  RDSListPage: () => <div data-testid="rds-page">RDS Content</div>,
  VPCPage: () => <div data-testid="vpc-page">VPC Content</div>,
  TerraformPage: () => (
    <div data-testid="terraform-page">Terraform Content</div>
  ),
  TopologyPage: () => <div data-testid="topology-page">Topology Content</div>,
}));

// Mock the hooks used by Layout components
vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: {
      last_refreshed: "2024-01-15T12:00:00Z",
      total_resources: 10,
    },
  }),
  useRefreshData: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe("App", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });

  it("renders the header with application title", () => {
    render(<App />);
    expect(
      screen.getByText("AWS Infrastructure Visualizer"),
    ).toBeInTheDocument();
  });

  it("renders the sidebar navigation", () => {
    render(<App />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("EC2 Instances")).toBeInTheDocument();
    expect(screen.getByText("RDS Databases")).toBeInTheDocument();
    expect(screen.getByText("VPC Networking")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("renders Dashboard page at root route", () => {
    render(<App />);
    expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
  });

  it("renders main content area", () => {
    render(<App />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders header with refresh button", () => {
    render(<App />);
    expect(screen.getByText("Refresh")).toBeInTheDocument();
  });
});

describe("SettingsPlaceholder", () => {
  it("is accessible via navigation", () => {
    render(<App />);
    // Settings link should be present in sidebar
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
