import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { SettingsPage } from "./SettingsPage";

// Mock auth context
const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API client
const mockGetAuthSettings = vi.fn();
const mockUpdateOIDCSettings = vi.fn();
const mockTestOIDCConnection = vi.fn();

vi.mock("@/api/client", () => ({
  getAuthSettings: (...args: unknown[]) => mockGetAuthSettings(...args),
  updateOIDCSettings: (...args: unknown[]) => mockUpdateOIDCSettings(...args),
  testOIDCConnection: (...args: unknown[]) => mockTestOIDCConnection(...args),
}));

const mockSettings = {
  local_auth_enabled: true,
  oidc: {
    enabled: false,
    issuer: null,
    client_id: null,
    client_secret_configured: false,
    display_name: "OIDC",
    updated_at: null,
    updated_by: null,
  },
};

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthSettings.mockResolvedValue(mockSettings);
    mockUpdateOIDCSettings.mockResolvedValue({});
  });

  describe("non-admin users", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: "user",
          is_admin: false,
          auth_provider: "local",
        },
      });
    });

    it("shows admin required message for non-admin users", async () => {
      render(<SettingsPage />);

      expect(
        screen.getByText(
          "Admin privileges required to access additional settings.",
        ),
      ).toBeInTheDocument();
    });

    it("shows Settings heading", () => {
      render(<SettingsPage />);

      expect(screen.getByText("Settings")).toBeInTheDocument();
    });

    it("does not fetch settings for non-admin users", () => {
      render(<SettingsPage />);

      expect(mockGetAuthSettings).not.toHaveBeenCalled();
    });
  });

  describe("admin users", () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: {
          id: 1,
          username: "admin",
          is_admin: true,
          auth_provider: "local",
        },
      });
    });

    it("shows loading state while fetching settings", () => {
      mockGetAuthSettings.mockImplementation(
        () => new Promise(() => {}), // Never resolves
      );

      render(<SettingsPage />);

      // Loader2 icon renders as an SVG with animate-spin
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });

    it("renders settings page with local auth status", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Local Authentication")).toBeInTheDocument();
      });

      expect(screen.getByText("Enabled")).toBeInTheDocument();
    });

    it("renders OIDC settings form", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("OpenID Connect (OIDC)")).toBeInTheDocument();
      });
    });

    it("shows error when settings fetch fails", async () => {
      mockGetAuthSettings.mockRejectedValue(new Error("Network error"));

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load settings")).toBeInTheDocument();
      });
    });

    it("renders OIDC form fields", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Issuer URL")).toBeInTheDocument();
      });

      expect(screen.getByText("Client ID")).toBeInTheDocument();
      expect(screen.getByText("Client Secret")).toBeInTheDocument();
      expect(screen.getByText("Display Name")).toBeInTheDocument();
    });

    it("renders save button", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save Changes" }),
        ).toBeInTheDocument();
      });
    });

    it("renders test button for issuer URL", async () => {
      render(<SettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Test" }),
        ).toBeInTheDocument();
      });
    });

    it("shows disabled local auth when config says disabled", async () => {
      mockGetAuthSettings.mockResolvedValue({
        ...mockSettings,
        local_auth_enabled: false,
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Disabled")).toBeInTheDocument();
      });
    });

    it("saves OIDC settings on form submission", async () => {
      const user = userEvent.setup();

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Issuer URL")).toBeInTheDocument();
      });

      const issuerInput = screen.getByPlaceholderText(
        "https://your-domain.okta.com",
      );
      const clientIdInput = screen.getByPlaceholderText("your-client-id");

      await user.type(issuerInput, "https://idp.example.com");
      await user.type(clientIdInput, "my-client-id");

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockUpdateOIDCSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            enabled: false,
            issuer: "https://idp.example.com",
            client_id: "my-client-id",
          }),
        );
      });
    });

    it("shows success message after saving", async () => {
      const user = userEvent.setup();

      render(<SettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save Changes" }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(
          screen.getByText("Settings saved successfully"),
        ).toBeInTheDocument();
      });
    });

    it("shows error message when save fails", async () => {
      mockUpdateOIDCSettings.mockRejectedValue({
        response: { data: { detail: "Validation error" } },
      });
      const user = userEvent.setup();

      render(<SettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Save Changes" }),
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(screen.getByText("Validation error")).toBeInTheDocument();
      });
    });

    it("tests OIDC connection", async () => {
      mockTestOIDCConnection.mockResolvedValue({
        success: true,
        message: "Successfully connected",
      });
      const user = userEvent.setup();

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Issuer URL")).toBeInTheDocument();
      });

      const issuerInput = screen.getByPlaceholderText(
        "https://your-domain.okta.com",
      );
      await user.type(issuerInput, "https://idp.example.com");

      await user.click(screen.getByRole("button", { name: "Test" }));

      await waitFor(() => {
        expect(screen.getByText("Successfully connected")).toBeInTheDocument();
      });
    });

    it("shows test connection failure", async () => {
      mockTestOIDCConnection.mockRejectedValue(new Error("Connection failed"));
      const user = userEvent.setup();

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Issuer URL")).toBeInTheDocument();
      });

      const issuerInput = screen.getByPlaceholderText(
        "https://your-domain.okta.com",
      );
      await user.type(issuerInput, "https://bad-idp.example.com");

      await user.click(screen.getByRole("button", { name: "Test" }));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to test connection"),
        ).toBeInTheDocument();
      });
    });

    it("shows last updated info when available", async () => {
      mockGetAuthSettings.mockResolvedValue({
        ...mockSettings,
        oidc: {
          ...mockSettings.oidc,
          updated_at: "2024-06-15T10:30:00Z",
          updated_by: "admin",
        },
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByText(/by admin/)).toBeInTheDocument();
      });
    });

    it("shows client secret configured notice", async () => {
      mockGetAuthSettings.mockResolvedValue({
        ...mockSettings,
        oidc: {
          ...mockSettings.oidc,
          client_secret_configured: true,
        },
      });

      render(<SettingsPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/A client secret is already configured/),
        ).toBeInTheDocument();
      });
    });
  });
});
