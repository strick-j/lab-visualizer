import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { CyberArkPage } from "./CyberArkPage";

// Mock child components as simple stubs
vi.mock("@/components/cyberark/CyberArkTabNavigation", () => ({
  CyberArkTabNavigation: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <div data-testid="tab-nav">
      <button onClick={() => onTabChange("safes")}>Safes</button>
      <button onClick={() => onTabChange("roles")}>Roles</button>
      <button onClick={() => onTabChange("users")}>Users</button>
      <button onClick={() => onTabChange("sia-policies")}>SIA Policies</button>
      <span data-testid="active-tab">{activeTab}</span>
    </div>
  ),
}));

vi.mock("@/components/cyberark/SafeList", () => ({
  SafeList: () => <div data-testid="safe-list">SafeList</div>,
}));

vi.mock("@/components/cyberark/RoleList", () => ({
  RoleList: () => <div data-testid="role-list">RoleList</div>,
}));

vi.mock("@/components/cyberark/UserList", () => ({
  UserList: () => <div data-testid="user-list">UserList</div>,
}));

vi.mock("@/components/cyberark/SIAPolicyList", () => ({
  SIAPolicyList: () => <div data-testid="sia-policy-list">SIAPolicyList</div>,
}));

describe("CyberArkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders CyberArk Resources heading", () => {
    render(<CyberArkPage />);
    expect(screen.getByText("CyberArk Resources")).toBeInTheDocument();
  });

  it("renders subtitle", () => {
    render(<CyberArkPage />);
    expect(
      screen.getByText(
        "Identity users and roles, Privilege Cloud safes, and SIA policies",
      ),
    ).toBeInTheDocument();
  });

  it("defaults to safes tab with SafeList visible", () => {
    render(<CyberArkPage />);
    expect(screen.getByTestId("safe-list")).toBeInTheDocument();
    expect(screen.queryByTestId("role-list")).not.toBeInTheDocument();
  });

  it("clicking Roles tab shows RoleList", () => {
    render(<CyberArkPage />);
    fireEvent.click(screen.getByText("Roles"));
    expect(screen.getByTestId("role-list")).toBeInTheDocument();
    expect(screen.queryByTestId("safe-list")).not.toBeInTheDocument();
  });

  it("clicking Users tab shows UserList", () => {
    render(<CyberArkPage />);
    fireEvent.click(screen.getByText("Users"));
    expect(screen.getByTestId("user-list")).toBeInTheDocument();
  });

  it("clicking SIA Policies tab shows SIAPolicyList", () => {
    render(<CyberArkPage />);
    fireEvent.click(screen.getByText("SIA Policies"));
    expect(screen.getByTestId("sia-policy-list")).toBeInTheDocument();
  });

  it("renders tab navigation", () => {
    render(<CyberArkPage />);
    expect(screen.getByTestId("tab-nav")).toBeInTheDocument();
  });

  it("clicking back to Safes shows SafeList again", () => {
    render(<CyberArkPage />);
    fireEvent.click(screen.getByText("Roles"));
    expect(screen.getByTestId("role-list")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Safes"));
    expect(screen.getByTestId("safe-list")).toBeInTheDocument();
  });
});
