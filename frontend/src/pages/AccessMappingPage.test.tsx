import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { AccessMappingPage } from "./AccessMappingPage";

// =============================================================================
// Mock data
// =============================================================================

const mockAccessData = {
  users: [
    { user_id: "u1", user_name: "john", display_name: "John", paths: [] },
  ],
  targets: [],
  total_users: 1,
  total_targets: 0,
  total_standing_paths: 2,
  total_jit_paths: 1,
};

let mockData: typeof mockAccessData | null = mockAccessData;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
const mockRefetch = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock("@/hooks", () => ({
  useAccessMapping: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    refetch: mockRefetch,
  }),
  useAccessMappingUsers: () => ({
    data: { users: [] },
  }),
  useRefreshData: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

let mockAuthUser: { is_admin: boolean } | null = { is_admin: true };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockAuthUser,
  }),
}));

// Mock child components as stubs
vi.mock("@/components/access-mapping/AccessMappingCanvas", () => ({
  AccessMappingCanvas: () => <div data-testid="canvas">Canvas</div>,
}));

vi.mock("@/components/access-mapping/AccessMappingDetailPanel", () => ({
  AccessMappingDetailPanel: () => <div data-testid="detail-panel">Detail</div>,
}));

vi.mock("@/components/access-mapping/AccessMappingFilterBar", () => ({
  AccessMappingFilterBar: () => <div data-testid="filter-bar">FilterBar</div>,
}));

vi.mock("@/components/access-mapping/AccessMappingLegend", () => ({
  AccessMappingLegend: () => <div data-testid="legend">Legend</div>,
}));

describe("AccessMappingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = mockAccessData;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockAuthUser = { is_admin: true };
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    render(<AccessMappingPage />);
    expect(
      screen.getByText("Loading access mapping data..."),
    ).toBeInTheDocument();
  });

  it("shows error state with message", () => {
    mockIsError = true;
    mockError = new Error("Network failure");
    mockData = null;
    render(<AccessMappingPage />);
    expect(
      screen.getByText("Failed to load access mapping"),
    ).toBeInTheDocument();
    expect(screen.getByText("Network failure")).toBeInTheDocument();
  });

  it("error has Retry button calling refetch", () => {
    mockIsError = true;
    mockError = new Error("fail");
    mockData = null;
    render(<AccessMappingPage />);
    const retryButton = screen.getByText("Retry");
    fireEvent.click(retryButton);
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("shows empty state when no users", () => {
    mockData = { ...mockAccessData, users: [] };
    render(<AccessMappingPage />);
    expect(
      screen.getByText("No access mapping data found"),
    ).toBeInTheDocument();
  });

  it("empty state shows Refresh Data button", () => {
    mockData = { ...mockAccessData, users: [] };
    render(<AccessMappingPage />);
    expect(screen.getByText("Refresh Data")).toBeInTheDocument();
  });

  it("refresh button calls mutateAsync", async () => {
    mockData = { ...mockAccessData, users: [] };
    mockMutateAsync.mockResolvedValueOnce(undefined);
    mockRefetch.mockResolvedValueOnce(undefined);
    render(<AccessMappingPage />);
    const refreshBtn = screen.getByText("Refresh Data");
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(false);
    });
  });

  it("renders canvas, filter bar, and legend with data", () => {
    render(<AccessMappingPage />);
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });

  it("handles null data gracefully", () => {
    mockData = null;
    mockIsLoading = false;
    mockIsError = false;
    render(<AccessMappingPage />);
    // Should show empty state when data is null
    expect(
      screen.getByText("No access mapping data found"),
    ).toBeInTheDocument();
  });

  it("handles undefined data gracefully", () => {
    mockData = undefined as unknown as typeof mockAccessData;
    mockIsLoading = false;
    mockIsError = false;
    render(<AccessMappingPage />);
    expect(
      screen.getByText("No access mapping data found"),
    ).toBeInTheDocument();
  });
});
