import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CyberArkSettings } from "./CyberArkSettings";

// =============================================================================
// Mock API functions
// =============================================================================

const mockGetCyberArkSettings = vi.fn();
const mockUpdateCyberArkSettings = vi.fn();
const mockTestCyberArkConnection = vi.fn();
const mockGetCyberArkSyncStatus = vi.fn();
const mockDiscoverCyberArkTenant = vi.fn();
const mockGetScimSettings = vi.fn();
const mockUpdateScimSettings = vi.fn();
const mockTestScimConnection = vi.fn();

vi.mock("@/api/client", () => ({
  getCyberArkSettings: (...args: unknown[]) => mockGetCyberArkSettings(...args),
  updateCyberArkSettings: (...args: unknown[]) =>
    mockUpdateCyberArkSettings(...args),
  testCyberArkConnection: (...args: unknown[]) =>
    mockTestCyberArkConnection(...args),
  getCyberArkSyncStatus: (...args: unknown[]) =>
    mockGetCyberArkSyncStatus(...args),
  discoverCyberArkTenant: (...args: unknown[]) =>
    mockDiscoverCyberArkTenant(...args),
  getScimSettings: (...args: unknown[]) => mockGetScimSettings(...args),
  updateScimSettings: (...args: unknown[]) => mockUpdateScimSettings(...args),
  testScimConnection: (...args: unknown[]) => mockTestScimConnection(...args),
}));

// =============================================================================
// Default responses
// =============================================================================

const defaultSettings = {
  enabled: true,
  tenant_name: "papaya",
  base_url: "https://papaya.privilegecloud.cyberark.cloud",
  identity_url: "https://abc1234.id.cyberark.cloud",
  uap_base_url: "https://papaya.uap.cyberark.cloud/api",
  client_id: "svc-account",
  has_client_secret: true,
  updated_at: "2024-01-15T12:00:00Z",
  updated_by: "admin",
};

const defaultScimSettings = {
  scim_enabled: true,
  scim_app_id: "labvisscim",
  scim_scope: "scim:read",
  scim_client_id: "scim-client",
  has_scim_client_secret: true,
};

const defaultSyncStatus = {
  config: {
    source: "api",
    enabled: true,
    db_settings_exists: true,
    db_enabled: true,
    all_fields_set: true,
  },
  database_counts: {
    roles_total: 5,
    roles_active: 4,
    safes: 10,
    accounts: 20,
    sia_policies: 3,
    users: 15,
  },
  last_sync: {
    synced_at: "2024-01-15T12:00:00Z",
    status: "success",
    resource_count: 53,
  },
};

describe("CyberArkSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCyberArkSettings.mockResolvedValue(defaultSettings);
    mockGetScimSettings.mockResolvedValue(defaultScimSettings);
    mockGetCyberArkSyncStatus.mockResolvedValue(defaultSyncStatus);
  });

  it("shows loading spinner on mount", () => {
    // Make settings hang
    mockGetCyberArkSettings.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<CyberArkSettings />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders CyberArk Integration after load", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("CyberArk Integration")).toBeInTheDocument();
    });
  });

  it("pre-fills tenant name and URLs", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("papaya")).toBeInTheDocument();
    });
    expect(
      screen.getByDisplayValue("https://papaya.privilegecloud.cyberark.cloud"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://abc1234.id.cyberark.cloud"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("svc-account")).toBeInTheDocument();
  });

  it("shows secret placeholder when secret exists", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("CyberArk Integration")).toBeInTheDocument();
    });
    // The password field should have placeholder "••••••••"
    const secretInputs = screen.getAllByPlaceholderText("••••••••");
    expect(secretInputs.length).toBeGreaterThan(0);
  });

  it("shows Secret saved hint when has_client_secret is true", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      // Both platform and SCIM have this hint
      const hints = screen.getAllByText("Secret saved. Leave blank to keep.");
      expect(hints.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("enable toggle reflects state", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Enable CyberArk")).toBeInTheDocument();
    });
  });

  it("calls discoverCyberArkTenant on Lookup click", async () => {
    mockDiscoverCyberArkTenant.mockResolvedValueOnce({
      success: true,
      base_url: "https://discovered.privilegecloud.cyberark.cloud",
      identity_url: "https://discovered.id.cyberark.cloud",
      uap_base_url: "https://discovered.uap.cyberark.cloud/api",
      region: "us-east",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Lookup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lookup"));
    await waitFor(() => {
      expect(mockDiscoverCyberArkTenant).toHaveBeenCalledWith({
        subdomain: "papaya",
      });
    });
  });

  it("shows discovered region on success", async () => {
    mockDiscoverCyberArkTenant.mockResolvedValueOnce({
      success: true,
      base_url: "https://x.privilegecloud.cyberark.cloud",
      identity_url: "https://x.id.cyberark.cloud",
      uap_base_url: "",
      region: "us-east",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Lookup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lookup"));
    await waitFor(() => {
      expect(
        screen.getByText("Discovered (region: us-east)"),
      ).toBeInTheDocument();
    });
  });

  it("shows error on discovery failure", async () => {
    mockDiscoverCyberArkTenant.mockResolvedValueOnce({
      success: false,
      message: "Tenant not found",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Lookup")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Lookup"));
    await waitFor(() => {
      expect(screen.getByText("Tenant not found")).toBeInTheDocument();
    });
  });

  it("calls testCyberArkConnection on Test Platform click", async () => {
    mockTestCyberArkConnection.mockResolvedValueOnce({
      success: true,
      message: "Connection successful",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Test Platform")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Test Platform"));
    await waitFor(() => {
      expect(mockTestCyberArkConnection).toHaveBeenCalled();
    });
  });

  it("shows green banner on test success", async () => {
    mockTestCyberArkConnection.mockResolvedValueOnce({
      success: true,
      message: "Connection successful",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Test Platform")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Test Platform"));
    await waitFor(() => {
      expect(screen.getByText("Connection successful")).toBeInTheDocument();
    });
  });

  it("shows red banner on test failure", async () => {
    mockTestCyberArkConnection.mockResolvedValueOnce({
      success: false,
      message: "Auth failed",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Test Platform")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Test Platform"));
    await waitFor(() => {
      expect(screen.getByText("Auth failed")).toBeInTheDocument();
    });
  });

  it("calls updateCyberArkSettings on Save", async () => {
    mockUpdateCyberArkSettings.mockResolvedValueOnce(defaultSettings);
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Save Platform Settings")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save Platform Settings"));
    await waitFor(() => {
      expect(mockUpdateCyberArkSettings).toHaveBeenCalled();
    });
  });

  it("shows Saved on successful save", async () => {
    mockUpdateCyberArkSettings.mockResolvedValueOnce(defaultSettings);
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Save Platform Settings")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save Platform Settings"));
    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("shows error on save failure", async () => {
    mockUpdateCyberArkSettings.mockRejectedValueOnce({
      response: { data: { detail: "Invalid config" } },
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Save Platform Settings")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save Platform Settings"));
    await waitFor(() => {
      expect(screen.getByText("Invalid config")).toBeInTheDocument();
    });
  });

  it("renders SCIM Integration section", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("SCIM Integration")).toBeInTheDocument();
    });
  });

  it("renders SCIM fields", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("SCIM App ID")).toBeInTheDocument();
      expect(screen.getByText("Scope")).toBeInTheDocument();
      expect(screen.getByText("SCIM Client ID")).toBeInTheDocument();
      expect(screen.getByText("SCIM Client Secret")).toBeInTheDocument();
    });
  });

  it("calls testScimConnection on Test SCIM click", async () => {
    mockTestScimConnection.mockResolvedValueOnce({
      success: true,
      message: "SCIM OK",
    });
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Test SCIM")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Test SCIM"));
    await waitFor(() => {
      expect(mockTestScimConnection).toHaveBeenCalled();
    });
  });

  it("calls updateScimSettings on Save SCIM click", async () => {
    mockUpdateScimSettings.mockResolvedValueOnce(defaultScimSettings);
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Save SCIM Settings")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Save SCIM Settings"));
    await waitFor(() => {
      expect(mockUpdateScimSettings).toHaveBeenCalled();
    });
  });

  it("renders Sync Status panel", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Sync Status")).toBeInTheDocument();
    });
  });

  it("expands Sync Status panel to show resource counts", async () => {
    render(<CyberArkSettings />);
    await waitFor(() => {
      expect(screen.getByText("Sync Status")).toBeInTheDocument();
    });
    // Click the Sync Status button to expand
    const syncButton = screen.getByText("Sync Status").closest("button")!;
    fireEvent.click(syncButton);
    await waitFor(() => {
      expect(screen.getByText("Roles")).toBeInTheDocument();
      expect(screen.getByText("Safes")).toBeInTheDocument();
      expect(screen.getByText("Accounts")).toBeInTheDocument();
      expect(screen.getByText("SIA Policies")).toBeInTheDocument();
    });
  });
});
