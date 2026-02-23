import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { UserList } from "./UserList";
import type { CyberArkIdentityUser } from "@/types";

// =============================================================================
// Mock data
// =============================================================================

const mockUser1: CyberArkIdentityUser = {
  id: 1,
  user_id: "u1",
  user_name: "john.doe",
  display_name: "John Doe",
  email: "john@example.com",
  active: true,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  is_deleted: false,
  updated_at: "2024-01-15T12:00:00Z",
};

const mockUser2: CyberArkIdentityUser = {
  id: 2,
  user_id: "u2",
  user_name: "jane.smith",
  display_name: null,
  email: null,
  active: false,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  is_deleted: false,
  updated_at: "2024-01-14T12:00:00Z",
};

let mockData: {
  data: CyberArkIdentityUser[];
  meta: { total: number; last_refreshed: string | null };
} | null = {
  data: [mockUser1, mockUser2],
  meta: { total: 2, last_refreshed: null },
};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useCyberArkUsers: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("UserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      data: [mockUser1, mockUser2],
      meta: { total: 2, last_refreshed: null },
    };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders users count", () => {
    render(<UserList />);
    expect(screen.getByText("2 users found")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<UserList />);
    expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument();
  });

  it("renders user names in table", () => {
    render(<UserList />);
    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("jane.smith")).toBeInTheDocument();
  });

  it("renders user IDs", () => {
    render(<UserList />);
    expect(screen.getByText("u1")).toBeInTheDocument();
    expect(screen.getByText("u2")).toBeInTheDocument();
  });

  it("renders display name or dash", () => {
    render(<UserList />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders email or dash", () => {
    render(<UserList />);
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<UserList />);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders status filter dropdown", () => {
    render(<UserList />);
    expect(screen.getByText("All statuses")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<UserList />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed");
    mockData = null;
    render(<UserList />);
    expect(screen.getByText("Error loading users")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<UserList />);
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });
});
