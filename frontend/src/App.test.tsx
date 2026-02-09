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
  LoginPage: () => <div data-testid="login-page">Login Content</div>,
  SettingsPage: () => <div data-testid="settings-page">Settings Content</div>,
  AuthCallbackPage: () => (
    <div data-testid="auth-callback-page">Auth Callback</div>
  ),
  SetupPage: () => <div data-testid="setup-page">Setup Content</div>,
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
  useAppInfo: () => ({
    data: { version: "0.0.0-test", build_sha: "abc1234", environment: "test" },
  }),
}));

// Mock the auth context
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({
    user: { username: "admin", display_name: "Admin", auth_provider: "local" },
    authConfig: {
      local_auth_enabled: true,
      oidc_enabled: false,
      setup_required: false,
    },
    isAuthenticated: true,
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    clearError: vi.fn(),
    setTokens: vi.fn(),
  }),
}));

// Mock the API client to prevent real API calls
vi.mock("@/api/client", () => ({
  getAuthConfig: vi.fn().mockResolvedValue({
    local_auth_enabled: true,
    oidc_enabled: false,
    oidc_issuer: null,
    oidc_display_name: null,
    setup_required: false,
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    username: "admin",
    display_name: "Admin",
    auth_provider: "local",
  }),
  default: {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
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
