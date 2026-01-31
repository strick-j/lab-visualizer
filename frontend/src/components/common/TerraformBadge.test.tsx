import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { TerraformBadge } from "./TerraformBadge";

describe("TerraformBadge", () => {
  it("renders managed badge correctly", () => {
    render(<TerraformBadge managed={true} />);
    expect(screen.getByText("Managed")).toBeInTheDocument();
  });

  it("renders unmanaged badge correctly", () => {
    render(<TerraformBadge managed={false} />);
    expect(screen.getByText("Unmanaged")).toBeInTheDocument();
  });

  it("applies managed styling when managed is true", () => {
    render(<TerraformBadge managed={true} />);
    const badge = screen.getByText("Managed");
    expect(badge).toHaveClass("bg-purple-100");
    expect(badge).toHaveClass("text-purple-700");
  });

  it("applies unmanaged styling when managed is false", () => {
    render(<TerraformBadge managed={false} />);
    const badge = screen.getByText("Unmanaged");
    expect(badge).toHaveClass("bg-gray-100");
    expect(badge).toHaveClass("text-gray-600");
  });

  it("renders terraform icon", () => {
    const { container } = render(<TerraformBadge managed={true} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("h-3", "w-3");
  });

  it("applies custom className", () => {
    render(<TerraformBadge managed={true} className="custom-class" />);
    const badge = screen.getByText("Managed");
    expect(badge).toHaveClass("custom-class");
  });

  it("has correct base styling", () => {
    render(<TerraformBadge managed={true} />);
    const badge = screen.getByText("Managed");
    expect(badge).toHaveClass("inline-flex");
    expect(badge).toHaveClass("items-center");
    expect(badge).toHaveClass("text-xs");
    expect(badge).toHaveClass("font-medium");
  });
});
