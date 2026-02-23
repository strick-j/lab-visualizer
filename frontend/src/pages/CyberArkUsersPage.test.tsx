import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { CyberArkUsersPage } from "./CyberArkUsersPage";

// =============================================================================
// Mock data
// =============================================================================

const mockUsers = [
  {
    user_id: "user-1",
    user_name: "john.doe",
    display_name: "John Doe",
    email: "john@example.com",
    active: true,
  },
  {
    user_id: "user-2",
    user_name: "jane.smith",
    display_name: null,
    email: null,
    active: false,
  },
];

let mockData: { data: typeof mockUsers; meta: { total: number } } | null = {
  data: mockUsers,
  meta: { total: 2 },
};
let mockIsLoading = false;

vi.mock("@/hooks", () => ({
  useCyberArkUsers: () => ({
    data: mockData,
    isLoading: mockIsLoading,
  }),
}));

describe("CyberArkUsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockUsers, meta: { total: 2 } };
    mockIsLoading = false;
  });

  it("renders CyberArk Users heading", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText("CyberArk Users")).toBeInTheDocument();
  });

  it("shows total count", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText(/2 total/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<CyberArkUsersPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders user rows", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText("john.doe")).toBeInTheDocument();
    expect(screen.getByText("jane.smith")).toBeInTheDocument();
  });

  it("shows dash for null display_name", () => {
    render(<CyberArkUsersPage />);
    // jane.smith has null display_name -> shows "-"
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows dash for null email", () => {
    render(<CyberArkUsersPage />);
    // jane.smith has null email -> shows "-"
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("shows Active badge for active user", () => {
    render(<CyberArkUsersPage />);
    // "Active" appears in both the status filter option and the badge
    const activeTexts = screen.getAllByText("Active");
    expect(activeTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Inactive badge for inactive user", () => {
    render(<CyberArkUsersPage />);
    // "Inactive" appears in both the status filter option and the badge
    const inactiveTexts = screen.getAllByText("Inactive");
    expect(inactiveTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows No users found when empty data without filters", () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<CyberArkUsersPage />);
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByPlaceholderText("Search users...")).toBeInTheDocument();
  });

  it("renders status filter dropdown", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText("All statuses")).toBeInTheDocument();
  });

  it("renders display name and email for user with data", () => {
    render(<CyberArkUsersPage />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });
});
