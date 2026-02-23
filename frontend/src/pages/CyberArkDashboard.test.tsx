import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { CyberArkDashboardPage } from "./CyberArkDashboard";

// =============================================================================
// Mock data
// =============================================================================

const mockSafes = [
  {
    safe_name: "AdminSafe",
    description: "Admin safe",
    number_of_members: 5,
    number_of_accounts: 10,
    tf_managed: false,
  },
  {
    safe_name: "AppSafe",
    description: null,
    number_of_members: 3,
    number_of_accounts: 8,
    tf_managed: true,
  },
];

const mockRoles = [
  {
    role_id: "r1",
    role_name: "Admin",
    description: "Admin role",
    tf_managed: true,
  },
  { role_id: "r2", role_name: "Viewer", description: null, tf_managed: false },
];

const mockPolicies = [
  {
    policy_id: "p1",
    policy_name: "VMAccess",
    policy_type: "vm",
    status: "active",
    tf_managed: false,
  },
  {
    policy_id: "p2",
    policy_name: "DBAccess",
    policy_type: "database",
    status: "inactive",
    tf_managed: false,
  },
];

const mockUsers = [
  { user_id: "u1", user_name: "john", active: true },
  { user_id: "u2", user_name: "jane", active: false },
];

let mockSafesData: {
  data: typeof mockSafes;
  meta: { total: number; last_refreshed: string | null };
} | null = { data: mockSafes, meta: { total: 2, last_refreshed: null } };
let mockRolesData: {
  data: typeof mockRoles;
  meta: { total: number; last_refreshed: string | null };
} | null = { data: mockRoles, meta: { total: 2, last_refreshed: null } };
let mockPoliciesData: {
  data: typeof mockPolicies;
  meta: { total: number; last_refreshed: string | null };
} | null = { data: mockPolicies, meta: { total: 2, last_refreshed: null } };
let mockUsersData: {
  data: typeof mockUsers;
  meta: { total: number; last_refreshed: string | null };
} | null = { data: mockUsers, meta: { total: 2, last_refreshed: null } };
let mockDriftData: {
  drift_detected: boolean;
  items: Array<{
    resource_type: string;
    resource_id: string;
    drift_type: string;
  }>;
} | null = { drift_detected: false, items: [] };

let mockSafesLoading = false;
let mockRolesLoading = false;
let mockPoliciesLoading = false;
let mockUsersLoading = false;

vi.mock("@/hooks", () => ({
  useCyberArkSafes: () => ({
    data: mockSafesData,
    isLoading: mockSafesLoading,
  }),
  useCyberArkRoles: () => ({
    data: mockRolesData,
    isLoading: mockRolesLoading,
  }),
  useCyberArkSIAPolicies: () => ({
    data: mockPoliciesData,
    isLoading: mockPoliciesLoading,
  }),
  useCyberArkDrift: () => ({ data: mockDriftData }),
  useCyberArkUsers: () => ({
    data: mockUsersData,
    isLoading: mockUsersLoading,
  }),
}));

describe("CyberArkDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafesData = {
      data: mockSafes,
      meta: { total: 2, last_refreshed: null },
    };
    mockRolesData = {
      data: mockRoles,
      meta: { total: 2, last_refreshed: null },
    };
    mockPoliciesData = {
      data: mockPolicies,
      meta: { total: 2, last_refreshed: null },
    };
    mockUsersData = {
      data: mockUsers,
      meta: { total: 2, last_refreshed: null },
    };
    mockDriftData = { drift_detected: false, items: [] };
    mockSafesLoading = false;
    mockRolesLoading = false;
    mockPoliciesLoading = false;
    mockUsersLoading = false;
  });

  it("renders CyberArk Dashboard heading", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("CyberArk Dashboard")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<CyberArkDashboardPage />);
    expect(
      screen.getByText("Overview of Identity Security resources"),
    ).toBeInTheDocument();
  });

  it("shows loading state when all hooks loading", () => {
    mockSafesLoading = true;
    mockRolesLoading = true;
    mockPoliciesLoading = true;
    mockUsersLoading = true;
    const { container } = render(<CyberArkDashboardPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders summary stat cards with counts", () => {
    render(<CyberArkDashboardPage />);
    // SummaryStatCard renders the value
    const twos = screen.getAllByText("2");
    expect(twos.length).toBeGreaterThanOrEqual(4);
  });

  it("shows active subtitle for users and policies", () => {
    render(<CyberArkDashboardPage />);
    // "1 active" appears for both users (1 active user) and policies (1 active policy)
    const activeTexts = screen.getAllByText("1 active");
    expect(activeTexts).toHaveLength(2);
  });

  it("shows total accounts subtitle", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("18 accounts")).toBeInTheDocument();
  });

  it("shows no drift detected", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("No drift detected")).toBeInTheDocument();
  });

  it("shows drift items when drift detected", () => {
    mockDriftData = {
      drift_detected: true,
      items: [
        {
          resource_type: "safe",
          resource_id: "OrphanSafe",
          drift_type: "orphaned",
        },
      ],
    };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("1 drift item(s) detected")).toBeInTheDocument();
    expect(screen.getByText("OrphanSafe")).toBeInTheDocument();
    expect(screen.getByText("safe")).toBeInTheDocument();
    expect(screen.getByText("orphaned")).toBeInTheDocument();
  });

  it("shows +N more items when more than 5 drift items", () => {
    mockDriftData = {
      drift_detected: true,
      items: Array.from({ length: 7 }, (_, i) => ({
        resource_type: "safe",
        resource_id: `item-${i}`,
        drift_type: "orphaned",
      })),
    };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("+2 more items")).toBeInTheDocument();
  });

  it("renders Recent Safes section", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("Recent Safes")).toBeInTheDocument();
    expect(screen.getByText("AdminSafe")).toBeInTheDocument();
    expect(screen.getByText("10 accounts")).toBeInTheDocument();
    expect(screen.getByText("5 members")).toBeInTheDocument();
  });

  it("renders Recent Roles section", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("Recent Roles")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("shows TF badge for terraform-managed roles", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("TF")).toBeInTheDocument();
  });

  it("renders Recent SIA Policies section", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("Recent SIA Policies")).toBeInTheDocument();
    expect(screen.getByText("VMAccess")).toBeInTheDocument();
  });

  it("shows empty message when no safes", () => {
    mockSafesData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("No safes found")).toBeInTheDocument();
  });

  it("shows empty message when no roles", () => {
    mockRolesData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("No roles found")).toBeInTheDocument();
  });

  it("shows empty message when no policies", () => {
    mockPoliciesData = { data: [], meta: { total: 0, last_refreshed: null } };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("No SIA policies found")).toBeInTheDocument();
  });

  it("renders View all links", () => {
    render(<CyberArkDashboardPage />);
    const viewAllLinks = screen.getAllByText("View all →");
    expect(viewAllLinks).toHaveLength(3);
  });

  it("shows last refreshed when available", () => {
    mockSafesData = {
      data: mockSafes,
      meta: { total: 2, last_refreshed: new Date().toISOString() },
    };
    render(<CyberArkDashboardPage />);
    expect(screen.getByText(/Data last refreshed/)).toBeInTheDocument();
  });

  it("handles null data gracefully", () => {
    mockSafesData = null;
    mockRolesData = null;
    mockPoliciesData = null;
    mockUsersData = null;
    mockDriftData = null;
    render(<CyberArkDashboardPage />);
    // Should render with 0 counts
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });

  it("renders view links for stat cards", () => {
    render(<CyberArkDashboardPage />);
    expect(screen.getByText("View users →")).toBeInTheDocument();
    expect(screen.getByText("View roles →")).toBeInTheDocument();
    expect(screen.getByText("View safes →")).toBeInTheDocument();
    expect(screen.getByText("View policies →")).toBeInTheDocument();
  });
});
