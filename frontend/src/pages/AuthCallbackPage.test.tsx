import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { AuthCallbackPage } from "./AuthCallbackPage";

// Mock auth context
const mockSetTokens = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("AuthCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetTokens.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      setTokens: mockSetTokens,
    });
    // Reset the URL hash
    window.location.hash = "";
  });

  it("shows error when no hash fragment is present", () => {
    window.location.hash = "";

    render(<AuthCallbackPage />);

    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(
      screen.getByText("No authentication data received"),
    ).toBeInTheDocument();
  });

  it("shows error when hash fragment is missing tokens", () => {
    window.location.hash = "#some_param=value";

    render(<AuthCallbackPage />);

    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(
      screen.getByText("Invalid authentication response"),
    ).toBeInTheDocument();
  });

  it("shows error when only access_token is present", () => {
    window.location.hash = "#access_token=abc123";

    render(<AuthCallbackPage />);

    expect(screen.getByText("Authentication Failed")).toBeInTheDocument();
    expect(
      screen.getByText("Invalid authentication response"),
    ).toBeInTheDocument();
  });

  it("calls setTokens and navigates when both tokens are present", () => {
    window.location.hash = "#access_token=abc123&refresh_token=def456";

    render(<AuthCallbackPage />);

    expect(mockSetTokens).toHaveBeenCalledWith("abc123", "def456");
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows loading spinner during normal callback processing", () => {
    window.location.hash = "#access_token=abc123&refresh_token=def456";

    render(<AuthCallbackPage />);

    expect(
      screen.getByText("Completing authentication..."),
    ).toBeInTheDocument();
  });

  it("renders return to login button on error", () => {
    window.location.hash = "";

    render(<AuthCallbackPage />);

    const button = screen.getByRole("button", { name: "Return to Login" });
    expect(button).toBeInTheDocument();
  });

  it("navigates to login when return button is clicked", async () => {
    const user = userEvent.setup();
    window.location.hash = "";

    render(<AuthCallbackPage />);

    const button = screen.getByRole("button", { name: "Return to Login" });
    await user.click(button);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });
});
