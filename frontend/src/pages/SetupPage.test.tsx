import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { SetupPage } from "./SetupPage";

// =============================================================================
// Mocks
// =============================================================================

const mockNavigate = vi.fn();
const mockSetTokens = vi.fn();
let mockAuthConfig: { setup_required: boolean } | null = {
  setup_required: true,
};
let mockAuthLoading = false;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    authConfig: mockAuthConfig,
    isLoading: mockAuthLoading,
    setTokens: mockSetTokens,
  }),
}));

const mockSetupAdmin = vi.fn();
vi.mock("@/api/client", () => ({
  setupAdmin: (...args: unknown[]) => mockSetupAdmin(...args),
}));

describe("SetupPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthConfig = { setup_required: true };
    mockAuthLoading = false;
    mockSetupAdmin.mockResolvedValue({
      access_token: "token-123",
      refresh_token: "refresh-456",
    });
  });

  it("renders Initial Setup heading", () => {
    render(<SetupPage />);
    expect(screen.getByText("Initial Setup")).toBeInTheDocument();
  });

  it("shows loading spinner when auth is loading", () => {
    mockAuthLoading = true;
    const { container } = render(<SetupPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /login when setup_required is false", () => {
    mockAuthConfig = { setup_required: false };
    render(<SetupPage />);
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("renders username, password, and confirmPassword inputs", () => {
    render(<SetupPage />);
    expect(screen.getByLabelText("Admin Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("submit button disabled when fields empty", () => {
    render(<SetupPage />);
    const button = screen.getByRole("button", {
      name: "Create Admin Account",
    });
    expect(button).toBeDisabled();
  });

  it("shows password validation checklist after typing", () => {
    render(<SetupPage />);
    const pwInput = screen.getByLabelText("Password");
    fireEvent.change(pwInput, { target: { value: "a" } });
    fireEvent.blur(pwInput);
    expect(screen.getByText("At least 12 characters")).toBeInTheDocument();
    expect(screen.getByText("One uppercase letter")).toBeInTheDocument();
    expect(screen.getByText("One lowercase letter")).toBeInTheDocument();
    expect(screen.getByText("One number")).toBeInTheDocument();
    expect(screen.getByText("One special character")).toBeInTheDocument();
  });

  it("mismatched passwords show error", () => {
    render(<SetupPage />);
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    fireEvent.change(pwInput, { target: { value: "Abc123!@#$xyz" } });
    fireEvent.change(confirmInput, { target: { value: "different" } });
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("matching passwords show success", () => {
    render(<SetupPage />);
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const validPw = "Abc123!@#$xyz";
    fireEvent.change(pwInput, { target: { value: validPw } });
    fireEvent.change(confirmInput, { target: { value: validPw } });
    expect(screen.getByText("Passwords match")).toBeInTheDocument();
  });

  it("submit button enabled when all fields valid", () => {
    render(<SetupPage />);
    const usernameInput = screen.getByLabelText("Admin Username");
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const validPw = "Abc123!@#$xyz";

    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(pwInput, { target: { value: validPw } });
    fireEvent.change(confirmInput, { target: { value: validPw } });

    const button = screen.getByRole("button", {
      name: "Create Admin Account",
    });
    expect(button).toBeEnabled();
  });

  it("successful submit calls setupAdmin and navigates", async () => {
    render(<SetupPage />);
    const usernameInput = screen.getByLabelText("Admin Username");
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const validPw = "Abc123!@#$xyz";

    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(pwInput, { target: { value: validPw } });
    fireEvent.change(confirmInput, { target: { value: validPw } });

    const button = screen.getByRole("button", {
      name: "Create Admin Account",
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSetupAdmin).toHaveBeenCalledWith({
        username: "admin",
        password: validPw,
        confirm_password: validPw,
      });
    });

    await waitFor(() => {
      expect(mockSetTokens).toHaveBeenCalledWith("token-123", "refresh-456");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("failed submit shows API error", async () => {
    mockSetupAdmin.mockRejectedValueOnce({
      response: { data: { detail: "Username already exists" } },
    });

    render(<SetupPage />);
    const usernameInput = screen.getByLabelText("Admin Username");
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const validPw = "Abc123!@#$xyz";

    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(pwInput, { target: { value: validPw } });
    fireEvent.change(confirmInput, { target: { value: validPw } });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Admin Account" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Username already exists")).toBeInTheDocument();
    });
  });

  it("button shows Creating account... while submitting", async () => {
    // Make setupAdmin hang
    mockSetupAdmin.mockImplementation(() => new Promise(() => {}));

    render(<SetupPage />);
    const usernameInput = screen.getByLabelText("Admin Username");
    const pwInput = screen.getByLabelText("Password");
    const confirmInput = screen.getByLabelText("Confirm Password");
    const validPw = "Abc123!@#$xyz";

    fireEvent.change(usernameInput, { target: { value: "admin" } });
    fireEvent.change(pwInput, { target: { value: validPw } });
    fireEvent.change(confirmInput, { target: { value: validPw } });

    fireEvent.click(
      screen.getByRole("button", { name: "Create Admin Account" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Creating account...")).toBeInTheDocument();
    });
  });
});
