import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Layout } from "./Layout";

// Mock the hooks used by Header
vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: {
      last_refreshed: "2024-01-15T12:00:00Z",
      total_resources: 10,
    },
  }),
  useAppInfo: () => ({
    data: { version: "1.0.0", build_sha: "abc123", build_date: "", environment: "test", timestamp: "" },
  }),
  useRefreshData: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock the auth context
vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useAuth: () => ({
    user: { username: "admin", display_name: "Admin", auth_provider: "local" },
    authConfig: { local_auth_enabled: true, oidc_enabled: false },
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

// Mock react-router-dom's Outlet
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

describe("Layout", () => {
  it("renders the Header", () => {
    render(<Layout />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the Sidebar", () => {
    render(<Layout />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders the main content area", () => {
    render(<Layout />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the Outlet for child routes", () => {
    render(<Layout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("has correct structure", () => {
    const { container } = render(<Layout />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("min-h-screen");
  });
});
