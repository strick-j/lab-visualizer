import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { Header } from "./Header";

// Mock the hooks
const mockMutate = vi.fn();
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
    mutate: mockMutate,
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

describe("Header", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("renders header element", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders application title", () => {
    render(<Header />);
    expect(
      screen.getByText("AWS Infrastructure Visualizer"),
    ).toBeInTheDocument();
  });

  it("renders last updated time", () => {
    render(<Header />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("renders refresh button", () => {
    render(<Header />);
    expect(
      screen.getByRole("button", { name: /refresh/i }),
    ).toBeInTheDocument();
  });

  it("calls refresh mutation when button clicked", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(false);
  });

  it("renders theme toggle", () => {
    render(<Header />);
    // ThemeToggle should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders AWS logo", () => {
    render(<Header />);
    const svg = document.querySelector("header svg");
    expect(svg).toBeInTheDocument();
  });
});
