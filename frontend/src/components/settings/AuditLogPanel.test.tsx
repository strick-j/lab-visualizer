import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { AuditLogPanel } from "./AuditLogPanel";

// Mock API client
const mockGetAuditLogs = vi.fn();

vi.mock("@/api/client", () => ({
  getAuditLogs: (...args: unknown[]) => mockGetAuditLogs(...args),
}));

const mockLogs = [
  {
    id: 1,
    timestamp: "2024-06-15T10:30:00Z",
    user_id: 1,
    username: "admin",
    action: "settings.update",
    resource_type: "oidc",
    resource_id: "config-1",
    details: { field: "issuer", old: "old-val", new: "new-val" },
    ip_address: "127.0.0.1",
  },
  {
    id: 2,
    timestamp: "2024-06-15T11:00:00Z",
    user_id: 2,
    username: "user1",
    action: "auth.login",
    resource_type: null,
    resource_id: null,
    details: null,
    ip_address: "10.0.0.1",
  },
];

describe("AuditLogPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuditLogs.mockResolvedValue({
      data: mockLogs,
      total: 2,
      page: 1,
      page_size: 25,
      has_more: false,
    });
  });

  it("shows loading spinner on mount", () => {
    mockGetAuditLogs.mockImplementation(() => new Promise(() => {}));

    render(<AuditLogPanel />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders audit log entries after fetch", async () => {
    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    expect(screen.getByText("user1")).toBeInTheDocument();
    expect(screen.getByText("settings.update")).toBeInTheDocument();
    expect(screen.getByText("auth.login")).toBeInTheDocument();
  });

  it("shows empty state when no logs", async () => {
    mockGetAuditLogs.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      page_size: 25,
      has_more: false,
    });

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(
        screen.getByText("No audit log entries found."),
      ).toBeInTheDocument();
    });
  });

  it("shows error message on fetch failure", async () => {
    mockGetAuditLogs.mockRejectedValue(new Error("Network error"));

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load audit logs")).toBeInTheDocument();
    });
  });

  it("filters by action", async () => {
    const user = userEvent.setup();

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    mockGetAuditLogs.mockClear();

    const actionInput = screen.getByPlaceholderText("Filter by action...");
    await user.type(actionInput, "login");

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ action: "login" }),
      );
    });
  });

  it("filters by username", async () => {
    const user = userEvent.setup();

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    mockGetAuditLogs.mockClear();

    const usernameInput = screen.getByPlaceholderText("Filter by username...");
    await user.type(usernameInput, "admin");

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ username: "admin" }),
      );
    });
  });

  it("shows pagination controls when more than one page", async () => {
    mockGetAuditLogs.mockResolvedValue({
      data: mockLogs,
      total: 50,
      page: 1,
      page_size: 25,
      has_more: true,
    });

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    expect(screen.getByText(/Showing 1-25 of 50/)).toBeInTheDocument();
  });

  it("navigates to next page", async () => {
    const user = userEvent.setup();

    mockGetAuditLogs.mockResolvedValue({
      data: mockLogs,
      total: 50,
      page: 1,
      page_size: 25,
      has_more: true,
    });

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
    });

    mockGetAuditLogs.mockClear();

    // Click the next page button (second chevron button)
    const nextButton = screen.getByText("1 / 2").nextElementSibling;
    expect(nextButton).toBeInTheDocument();
    await user.click(nextButton!);

    await waitFor(() => {
      expect(mockGetAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });

  it("refresh button reloads logs", async () => {
    const user = userEvent.setup();

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    mockGetAuditLogs.mockClear();

    await user.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(mockGetAuditLogs).toHaveBeenCalled();
  });

  it("displays resource type:id when present", async () => {
    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("oidc: config-1")).toBeInTheDocument();
    });
  });

  it('displays "-" when resource type is missing', async () => {
    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("admin")).toBeInTheDocument();
    });

    // The second log entry has null resource_type, should show "-"
    const cells = screen.getAllByText("-");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });

  it("truncates long details JSON to 100 chars", async () => {
    const longDetails: Record<string, string> = {};
    for (let i = 0; i < 20; i++) {
      longDetails[`key${i}`] = `value-that-is-long-${i}`;
    }

    mockGetAuditLogs.mockResolvedValue({
      data: [
        {
          id: 3,
          timestamp: "2024-06-15T12:00:00Z",
          user_id: 1,
          username: "admin",
          action: "test.action",
          resource_type: null,
          resource_id: null,
          details: longDetails,
          ip_address: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 25,
      has_more: false,
    });

    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("test.action")).toBeInTheDocument();
    });

    // The details cell should be truncated via slice(0, 100)
    const detailsCells = document.querySelectorAll("td.max-w-xs");
    expect(detailsCells.length).toBeGreaterThanOrEqual(1);
    const detailsText = detailsCells[0]?.textContent || "";
    expect(detailsText.length).toBeLessThanOrEqual(100);
  });

  it("shows event count in header", async () => {
    render(<AuditLogPanel />);

    await waitFor(() => {
      expect(screen.getByText("2 events recorded")).toBeInTheDocument();
    });
  });
});
