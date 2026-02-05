import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";

// Mock auth context
const mockLogin = vi.fn();
const mockClearError = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: "/login" }),
  };
});

// Mock API client
vi.mock("@/api/client", () => ({
  initiateOIDCLogin: vi.fn(),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: true,
        oidc_enabled: false,
        oidc_issuer: null,
        oidc_display_name: null,
      },
    });
  });

  it("renders the login page header", () => {
    render(<LoginPage />);

    expect(
      screen.getByText("AWS Infrastructure Visualizer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sign in to access the dashboard"),
    ).toBeInTheDocument();
  });

  it("renders local login form when local auth is enabled", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("does not render local login form when local auth is disabled", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: false,
        oidc_enabled: true,
        oidc_issuer: "https://idp.example.com",
        oidc_display_name: "Corporate SSO",
      },
    });

    render(<LoginPage />);

    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("renders OIDC login button when OIDC is enabled", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: true,
        oidc_enabled: true,
        oidc_issuer: "https://idp.example.com",
        oidc_display_name: "Corporate SSO",
      },
    });

    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /Sign in with Corporate SSO/i }),
    ).toBeInTheDocument();
  });

  it("shows divider when multiple auth methods are enabled", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: true,
        oidc_enabled: true,
        oidc_issuer: "https://idp.example.com",
        oidc_display_name: "OIDC",
      },
    });

    render(<LoginPage />);

    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("does not show divider when only one auth method is enabled", () => {
    render(<LoginPage />);

    expect(screen.queryByText("or")).not.toBeInTheDocument();
  });

  it("submits login form with credentials", async () => {
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: "admin",
        password: "password123",
      });
    });
  });

  it("shows error message from auth context", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: "Invalid credentials",
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: true,
        oidc_enabled: false,
        oidc_issuer: null,
        oidc_display_name: null,
      },
    });

    render(<LoginPage />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows loading spinner when checking auth state", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: true,
      error: null,
      clearError: mockClearError,
      authConfig: null,
    });

    render(<LoginPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows no auth methods message when none are configured", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: false,
        oidc_enabled: false,
        oidc_issuer: null,
        oidc_display_name: null,
      },
    });

    render(<LoginPage />);

    expect(
      screen.getByText("No authentication methods are configured."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Please contact your administrator."),
    ).toBeInTheDocument();
  });

  it("shows 'Signing in...' text during form submission", async () => {
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Signing in...")).toBeInTheDocument();
  });

  it("disables form fields during submission", async () => {
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText("Username"), "admin");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByLabelText("Username")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();
  });

  it("uses default OIDC display name when not configured", () => {
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      clearError: mockClearError,
      authConfig: {
        local_auth_enabled: false,
        oidc_enabled: true,
        oidc_issuer: "https://idp.example.com",
        oidc_display_name: null,
      },
    });

    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /Sign in with OIDC/i }),
    ).toBeInTheDocument();
  });
});
