import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { CyberArkTabNavigation } from "./CyberArkTabNavigation";

describe("CyberArkTabNavigation", () => {
  it("renders all four tabs", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="safes" onTabChange={onChange} />);
    expect(screen.getByText("Safes")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("SIA Policies")).toBeInTheDocument();
  });

  it("calls onTabChange when tab clicked", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="safes" onTabChange={onChange} />);
    fireEvent.click(screen.getByText("Roles"));
    expect(onChange).toHaveBeenCalledWith("roles");
  });

  it("calls onTabChange with users", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="safes" onTabChange={onChange} />);
    fireEvent.click(screen.getByText("Users"));
    expect(onChange).toHaveBeenCalledWith("users");
  });

  it("calls onTabChange with sia-policies", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="safes" onTabChange={onChange} />);
    fireEvent.click(screen.getByText("SIA Policies"));
    expect(onChange).toHaveBeenCalledWith("sia-policies");
  });

  it("highlights active tab with blue styling", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="roles" onTabChange={onChange} />);
    const rolesButton = screen.getByText("Roles").closest("button")!;
    expect(rolesButton.className).toContain("border-blue-500");
  });

  it("non-active tabs have transparent border", () => {
    const onChange = vi.fn();
    render(<CyberArkTabNavigation activeTab="safes" onTabChange={onChange} />);
    const rolesButton = screen.getByText("Roles").closest("button")!;
    expect(rolesButton.className).toContain("border-transparent");
  });
});
