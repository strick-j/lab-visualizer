import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { SafeList } from "./SafeList";
import type { CyberArkSafe } from "@/types";

// =============================================================================
// Mock data
// =============================================================================

const mockSafe1: CyberArkSafe = {
  id: 1,
  safe_name: "AdminSafe",
  description: "Admin safe for privileged accounts",
  managing_cpm: "PasswordManager",
  number_of_members: 5,
  number_of_accounts: 10,
  tf_managed: true,
  tf_state_source: "s3://bucket/state.tfstate",
  tf_resource_address: "cyberark_safe.admin",
  is_deleted: false,
  updated_at: "2024-01-15T12:00:00Z",
};

const mockSafe2: CyberArkSafe = {
  id: 2,
  safe_name: "AppSafe",
  description: null,
  managing_cpm: null,
  number_of_members: 3,
  number_of_accounts: 8,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  is_deleted: false,
  updated_at: "2024-01-14T12:00:00Z",
};

let mockData: {
  data: CyberArkSafe[];
  meta: { total: number; last_refreshed: string | null };
} | null = {
  data: [mockSafe1, mockSafe2],
  meta: { total: 2, last_refreshed: null },
};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useCyberArkSafes: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useCyberArkSafe: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe("SafeList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      data: [mockSafe1, mockSafe2],
      meta: { total: 2, last_refreshed: null },
    };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders safes count", () => {
    render(<SafeList />);
    expect(screen.getByText("2 safes found")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<SafeList />);
    expect(screen.getByPlaceholderText("Search safes...")).toBeInTheDocument();
  });

  it("renders terraform filter dropdown", () => {
    render(<SafeList />);
    expect(screen.getByText("All resources")).toBeInTheDocument();
  });

  it("renders safe names in table", () => {
    render(<SafeList />);
    expect(screen.getByText("AdminSafe")).toBeInTheDocument();
    expect(screen.getByText("AppSafe")).toBeInTheDocument();
  });

  it("renders safe description when present", () => {
    render(<SafeList />);
    expect(
      screen.getByText("Admin safe for privileged accounts"),
    ).toBeInTheDocument();
  });

  it("renders member counts", () => {
    render(<SafeList />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders account counts", () => {
    render(<SafeList />);
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<SafeList />);
    expect(screen.getByText("Safe Name")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Accounts")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<SafeList />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed");
    mockData = null;
    render(<SafeList />);
    expect(screen.getByText("Error loading safes")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<SafeList />);
    expect(screen.getByText("No safes found")).toBeInTheDocument();
  });
});
