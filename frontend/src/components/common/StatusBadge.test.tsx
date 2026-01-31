import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders active status correctly", () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders inactive status correctly", () => {
    render(<StatusBadge status="inactive" />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("renders transitioning status correctly", () => {
    render(<StatusBadge status="transitioning" />);
    expect(screen.getByText("Transit")).toBeInTheDocument();
  });

  it("renders error status correctly", () => {
    render(<StatusBadge status="error" />);
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("shows dot by default", () => {
    const { container } = render(<StatusBadge status="active" />);
    const dot = container.querySelector(".rounded-full.h-2.w-2");
    expect(dot).toBeInTheDocument();
  });

  it("hides dot when showDot is false", () => {
    const { container } = render(
      <StatusBadge status="active" showDot={false} />,
    );
    const dot = container.querySelector(".rounded-full.h-2.w-2");
    expect(dot).not.toBeInTheDocument();
  });

  it("applies small size styles", () => {
    const { container } = render(<StatusBadge status="active" size="sm" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass("text-xs");
  });

  it("applies medium size styles by default", () => {
    const { container } = render(<StatusBadge status="active" />);
    const badge = container.firstChild;
    expect(badge).toHaveClass("text-sm");
  });

  it("applies custom className", () => {
    const { container } = render(
      <StatusBadge status="active" className="custom-class" />,
    );
    const badge = container.firstChild;
    expect(badge).toHaveClass("custom-class");
  });

  it("animates dot for transitioning status", () => {
    const { container } = render(<StatusBadge status="transitioning" />);
    const dot = container.querySelector(".animate-pulse");
    expect(dot).toBeInTheDocument();
  });
});
