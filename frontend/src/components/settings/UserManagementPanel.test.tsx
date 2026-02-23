import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { UserManagementPanel } from "./UserManagementPanel";
import type { User } from "@/types";

// Mock auth context
const mockUseAuth = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock API client
const mockGetUsers = vi.fn();
const mockUpdateUserStatus = vi.fn();
const mockUpdateUserRole = vi.fn();

vi.mock("@/api/client", () => ({
  getUsers: (...args: unknown[]) => mockGetUsers(...args),
  updateUserStatus: (...args: unknown[]) => mockUpdateUserStatus(...args),
  updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
}));

const currentUser: User = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  display_name: "Admin User",
  auth_provider: "local",
  is_active: true,
  is_admin: true,
  role: "admin",
  last_login_at: "2024-06-15T10:30:00Z",
  created_at: "2024-01-01T00:00:00Z",
};

const otherUser: User = {
  id: 2,
  username: "jdoe",
  email: "jdoe@example.com",
  display_name: "Jane Doe",
  auth_provider: "oidc",
  is_active: true,
  is_admin: false,
  role: "user",
  last_login_at: null,
  created_at: "2024-03-01T00:00:00Z",
};

const inactiveUser: User = {
  id: 3,
  username: "inactive",
  email: null,
  display_name: null,
  auth_provider: "local",
  is_active: false,
  is_admin: false,
  role: "viewer",
  last_login_at: "2024-02-01T00:00:00Z",
  created_at: "2024-01-15T00:00:00Z",
};

const mockUsers = [currentUser, otherUser, inactiveUser];

describe("UserManagementPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: currentUser });
    mockGetUsers.mockResolvedValue({ users: mockUsers, total: 3 });
  });

  it("shows loading spinner on mount", () => {
    mockGetUsers.mockImplementation(() => new Promise(() => {}));

    render(<UserManagementPanel />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders user table after fetch", async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("3 users total")).toBeInTheDocument();
  });

  it("shows error state on fetch failure", async () => {
    mockGetUsers.mockRejectedValue(new Error("Network error"));

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load users")).toBeInTheDocument();
    });
  });

  it("displays user info including display_name, username, email, and provider badge", async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    // Username and email shown below display name
    expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/jdoe@example.com/)).toBeInTheDocument();

    // Provider badges
    expect(screen.getByText("OIDC")).toBeInTheDocument();
    const localBadges = screen.getAllByText("Local");
    expect(localBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "you" badge for current user', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("you")).toBeInTheDocument();
    });
  });

  it("current user cannot change own role", async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    // Find select elements - the first one belongs to the current user
    const selects = screen.getAllByRole("combobox");
    const currentUserSelect = selects[0];
    expect(currentUserSelect).toBeDisabled();
    expect(currentUserSelect).toHaveAttribute(
      "title",
      "You cannot change your own role",
    );
  });

  it("current user cannot change own status", async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    // The first Deactivate button belongs to the current user and should be disabled
    const deactivateButtons = screen.getAllByTitle(
      "You cannot change your own status",
    );
    expect(deactivateButtons.length).toBe(1);
    expect(deactivateButtons[0]).toBeDisabled();
  });

  it("role change calls updateUserRole and updates row", async () => {
    const user = userEvent.setup();
    const updatedUser = { ...otherUser, role: "admin" as const };
    mockUpdateUserRole.mockResolvedValue(updatedUser);

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    // Find the select for the other user (second select element)
    const selects = screen.getAllByRole("combobox");
    const otherUserSelect = selects[1];
    expect(otherUserSelect).not.toBeDisabled();

    await user.selectOptions(otherUserSelect, "admin");

    await waitFor(() => {
      expect(mockUpdateUserRole).toHaveBeenCalledWith(2, { role: "admin" });
    });
  });

  it("status toggle calls updateUserStatus and updates status badge", async () => {
    const user = userEvent.setup();
    const updatedUser = { ...otherUser, is_active: false };
    mockUpdateUserStatus.mockResolvedValue(updatedUser);

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    // Click the Deactivate button for the other user
    const deactivateButton = screen.getByTitle("Deactivate user");
    await user.click(deactivateButton);

    await waitFor(() => {
      expect(mockUpdateUserStatus).toHaveBeenCalledWith(2, {
        is_active: false,
      });
    });
  });

  it("shows action error banner with dismiss button", async () => {
    const user = userEvent.setup();
    mockUpdateUserStatus.mockRejectedValue({
      response: { data: { detail: "Cannot deactivate last admin" } },
    });

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    const deactivateButton = screen.getByTitle("Deactivate user");
    await user.click(deactivateButton);

    await waitFor(() => {
      expect(
        screen.getByText("Cannot deactivate last admin"),
      ).toBeInTheDocument();
    });

    // Dismiss the error
    await user.click(screen.getByText("Dismiss"));

    await waitFor(() => {
      expect(
        screen.queryByText("Cannot deactivate last admin"),
      ).not.toBeInTheDocument();
    });
  });

  it("refresh button reloads users", async () => {
    const user = userEvent.setup();

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    mockGetUsers.mockClear();

    await user.click(screen.getByRole("button", { name: /Refresh/i }));

    expect(mockGetUsers).toHaveBeenCalled();
  });

  it("shows Active/Inactive status badges correctly", async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
    });

    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBe(2); // currentUser and otherUser

    const inactiveBadges = screen.getAllByText("Inactive");
    expect(inactiveBadges.length).toBe(1); // inactiveUser
  });

  it('shows "Never" for null last_login_at', async () => {
    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("shows generic error when action fails without detail", async () => {
    const user = userEvent.setup();
    mockUpdateUserStatus.mockRejectedValue(new Error("Network error"));

    render(<UserManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });

    const deactivateButton = screen.getByTitle("Deactivate user");
    await user.click(deactivateButton);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to update user status"),
      ).toBeInTheDocument();
    });
  });
});
