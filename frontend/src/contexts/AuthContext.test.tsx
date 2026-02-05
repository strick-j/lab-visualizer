import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

// Mock the API client
const mockGetAuthConfig = vi.fn();
const mockApiLogin = vi.fn();
const mockApiLogout = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockApiRefreshToken = vi.fn();

vi.mock("@/api/client", () => ({
  getAuthConfig: (...args: unknown[]) => mockGetAuthConfig(...args),
  login: (...args: unknown[]) => mockApiLogin(...args),
  logout: (...args: unknown[]) => mockApiLogout(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  refreshToken: (...args: unknown[]) => mockApiRefreshToken(...args),
}));

// localStorage is mocked globally via setup.ts with vi.fn() stubs.
// We need to cast them to access mock methods.
const mockGetItem = localStorage.getItem as ReturnType<typeof vi.fn>;
const mockSetItem = localStorage.setItem as ReturnType<typeof vi.fn>;
const mockRemoveItem = localStorage.removeItem as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 1,
  username: "admin",
  email: null,
  display_name: "Admin User",
  auth_provider: "local" as const,
  is_active: true,
  is_admin: true,
  last_login_at: "2024-01-15T12:00:00Z",
  created_at: "2024-01-01T00:00:00Z",
};

const mockTokens = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
};

const mockAuthConfig = {
  local_auth_enabled: true,
  oidc_enabled: false,
  oidc_issuer: null,
  oidc_display_name: null,
};

// Test component that exposes auth context values
function TestConsumer() {
  const auth = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="username">{auth.user?.username ?? "none"}</span>
      <span data-testid="error">{auth.error ?? "none"}</span>
      <span data-testid="config">
        {auth.authConfig ? JSON.stringify(auth.authConfig) : "null"}
      </span>
      <button
        data-testid="login-btn"
        onClick={() =>
          auth.login({ username: "admin", password: "pass" }).catch(() => {})
        }
      >
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="clear-error-btn" onClick={() => auth.clearError()}>
        Clear Error
      </button>
      <button
        data-testid="set-tokens-btn"
        onClick={() =>
          auth.setTokens("oidc-access", "oidc-refresh").catch(() => {})
        }
      >
        Set Tokens
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: localStorage.getItem returns null (no stored tokens)
    mockGetItem.mockReturnValue(null);
    mockGetAuthConfig.mockResolvedValue(mockAuthConfig);
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockApiLogin.mockResolvedValue(mockTokens);
    mockApiLogout.mockResolvedValue(undefined);
    mockApiRefreshToken.mockResolvedValue(mockTokens);
  });

  describe("useAuth hook", () => {
    it("throws when used outside AuthProvider", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => render(<TestConsumer />)).toThrow(
        "useAuth must be used within an AuthProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("initialization", () => {
    it("starts in loading state", () => {
      mockGetAuthConfig.mockImplementation(() => new Promise(() => {}));

      renderWithProvider();

      expect(screen.getByTestId("loading").textContent).toBe("true");
      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });

    it("fetches auth config on mount", async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(mockGetAuthConfig).toHaveBeenCalledTimes(1);
      });
    });

    it("sets auth config after fetch", async () => {
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      const config = JSON.parse(
        screen.getByTestId("config").textContent ?? "null",
      );
      expect(config).toEqual(mockAuthConfig);
    });

    it("fetches user when token exists in localStorage", async () => {
      // Simulate existing token via the mocked getItem
      mockGetItem.mockImplementation((key: string) => {
        if (key === "auth_token") return "existing-token";
        if (key === "refresh_token") return "existing-refresh";
        return null;
      });

      renderWithProvider();

      await waitFor(() => {
        expect(mockGetCurrentUser).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId("username").textContent).toBe("admin");
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });
    });

    it("skips user fetch when no auth methods are enabled", async () => {
      mockGetAuthConfig.mockResolvedValue({
        local_auth_enabled: false,
        oidc_enabled: false,
        oidc_issuer: null,
        oidc_display_name: null,
      });

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("authenticated").textContent).toBe("false");
    });

    it("falls back to local auth config when config fetch fails", async () => {
      mockGetAuthConfig.mockRejectedValue(new Error("Network error"));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      const config = JSON.parse(
        screen.getByTestId("config").textContent ?? "null",
      );
      expect(config.local_auth_enabled).toBe(true);
      expect(config.oidc_enabled).toBe(false);
    });
  });

  describe("login", () => {
    it("calls API login and fetches user on success", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("login-btn"));

      await waitFor(() => {
        expect(mockApiLogin).toHaveBeenCalledWith({
          username: "admin",
          password: "pass",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
        expect(screen.getByTestId("username").textContent).toBe("admin");
      });
    });

    it("stores tokens in localStorage on login", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("login-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });

      // Verify localStorage.setItem was called with the tokens
      expect(mockSetItem).toHaveBeenCalledWith(
        "auth_token",
        "test-access-token",
      );
      expect(mockSetItem).toHaveBeenCalledWith(
        "refresh_token",
        "test-refresh-token",
      );
    });

    it("sets error on login failure", async () => {
      mockApiLogin.mockRejectedValue({
        response: { data: { detail: "Invalid credentials" } },
      });
      const user = userEvent.setup();

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("login-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe(
          "Invalid credentials",
        );
      });
    });
  });

  describe("logout", () => {
    it("clears user and tokens on logout", async () => {
      // Start with a token so the user gets authenticated during init
      mockGetItem.mockImplementation((key: string) => {
        if (key === "auth_token") return "existing-token";
        if (key === "refresh_token") return "existing-refresh";
        return null;
      });
      const user = userEvent.setup();

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });

      await user.click(screen.getByTestId("logout-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
        expect(screen.getByTestId("username").textContent).toBe("none");
      });

      expect(mockRemoveItem).toHaveBeenCalledWith("auth_token");
      expect(mockRemoveItem).toHaveBeenCalledWith("refresh_token");
    });

    it("clears state even when API logout fails", async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === "auth_token") return "existing-token";
        return null;
      });
      mockApiLogout.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });

      await user.click(screen.getByTestId("logout-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("false");
      });

      expect(mockRemoveItem).toHaveBeenCalledWith("auth_token");
    });
  });

  describe("clearError", () => {
    it("clears error state", async () => {
      mockApiLogin.mockRejectedValue({
        response: { data: { detail: "Error" } },
      });
      const user = userEvent.setup();

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("login-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe("Error");
      });

      await user.click(screen.getByTestId("clear-error-btn"));

      expect(screen.getByTestId("error").textContent).toBe("none");
    });
  });

  describe("setTokens (OIDC callback)", () => {
    it("stores tokens and fetches user", async () => {
      const user = userEvent.setup();
      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("set-tokens-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });

      // Verify tokens were stored via mocked setItem
      expect(mockSetItem).toHaveBeenCalledWith("auth_token", "oidc-access");
      expect(mockSetItem).toHaveBeenCalledWith("refresh_token", "oidc-refresh");
    });

    it("clears tokens and sets error when user fetch fails", async () => {
      // getCurrentUser: no token during init so fetchUser returns null.
      // When setTokens is called, getCurrentUser will fail.
      mockGetCurrentUser.mockRejectedValue(new Error("Token invalid"));
      const user = userEvent.setup();

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      await user.click(screen.getByTestId("set-tokens-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("error").textContent).toBe("Token invalid");
      });

      expect(mockRemoveItem).toHaveBeenCalledWith("auth_token");
    });
  });

  describe("token refresh", () => {
    it("attempts token refresh when getCurrentUser fails", async () => {
      // Simulate having tokens in localStorage
      mockGetItem.mockImplementation((key: string) => {
        if (key === "auth_token") return "expired-token";
        if (key === "refresh_token") return "valid-refresh";
        return null;
      });

      // First getCurrentUser call fails, second succeeds (after refresh)
      mockGetCurrentUser
        .mockRejectedValueOnce(new Error("Token expired"))
        .mockResolvedValueOnce(mockUser);

      renderWithProvider();

      await waitFor(() => {
        expect(mockApiRefreshToken).toHaveBeenCalledWith("valid-refresh");
      });

      await waitFor(() => {
        expect(screen.getByTestId("authenticated").textContent).toBe("true");
      });
    });

    it("clears tokens when refresh also fails", async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === "auth_token") return "expired-token";
        if (key === "refresh_token") return "expired-refresh";
        return null;
      });

      mockGetCurrentUser.mockRejectedValue(new Error("Token expired"));
      mockApiRefreshToken.mockRejectedValue(new Error("Refresh failed"));

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading").textContent).toBe("false");
      });

      expect(screen.getByTestId("authenticated").textContent).toBe("false");
      expect(mockRemoveItem).toHaveBeenCalledWith("auth_token");
      expect(mockRemoveItem).toHaveBeenCalledWith("refresh_token");
    });
  });
});
