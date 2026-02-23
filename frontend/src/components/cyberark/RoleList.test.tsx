import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { RoleList } from "./RoleList";
import type { CyberArkRole } from "@/types";

// =============================================================================
// Mock data
// =============================================================================

const mockRole1: CyberArkRole = {
  id: 1,
  role_id: "role-1",
  role_name: "Admin",
  description: "Administrator role",
  tf_managed: true,
  tf_state_source: "s3://bucket/state.tfstate",
  tf_resource_address: "cyberark_role.admin",
  is_deleted: false,
  updated_at: "2024-01-15T12:00:00Z",
};

const mockRole2: CyberArkRole = {
  id: 2,
  role_id: "role-2",
  role_name: "Viewer",
  description: null,
  tf_managed: false,
  tf_state_source: null,
  tf_resource_address: null,
  is_deleted: false,
  updated_at: "2024-01-14T12:00:00Z",
};

let mockData: {
  data: CyberArkRole[];
  meta: { total: number; last_refreshed: string | null };
} | null = {
  data: [mockRole1, mockRole2],
  meta: { total: 2, last_refreshed: null },
};
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useCyberArkRoles: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
  useCyberArkRole: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe("RoleList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      data: [mockRole1, mockRole2],
      meta: { total: 2, last_refreshed: null },
    };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders roles count", () => {
    render(<RoleList />);
    expect(screen.getByText("2 roles found")).toBeInTheDocument();
  });

  it("renders search input", () => {
    render(<RoleList />);
    expect(screen.getByPlaceholderText("Search roles...")).toBeInTheDocument();
  });

  it("renders role names in table", () => {
    render(<RoleList />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("renders role IDs", () => {
    render(<RoleList />);
    expect(screen.getByText("role-1")).toBeInTheDocument();
    expect(screen.getByText("role-2")).toBeInTheDocument();
  });

  it("renders description or dash for null", () => {
    render(<RoleList />);
    expect(screen.getByText("Administrator role")).toBeInTheDocument();
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<RoleList />);
    expect(screen.getByText("Role Name")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null;
    const { container } = render(<RoleList />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed");
    mockData = null;
    render(<RoleList />);
    expect(screen.getByText("Error loading roles")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<RoleList />);
    expect(screen.getByText("No roles found")).toBeInTheDocument();
  });

  it("renders terraform filter dropdown", () => {
    render(<RoleList />);
    expect(screen.getByText("All resources")).toBeInTheDocument();
  });
});
