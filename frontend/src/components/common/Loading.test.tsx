import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Loading, PageLoading } from "./Loading";

describe("Loading", () => {
  it("renders spinner", () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("applies small size", () => {
    const { container } = render(<Loading size="sm" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-4", "w-4");
  });

  it("applies medium size by default", () => {
    const { container } = render(<Loading />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-8", "w-8");
  });

  it("applies large size", () => {
    const { container } = render(<Loading size="lg" />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-12", "w-12");
  });

  it("shows text when provided", () => {
    render(<Loading text="Loading data..." />);
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
  });

  it("does not show text when not provided", () => {
    render(<Loading />);
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Loading className="custom-class" />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("custom-class");
  });

  it("applies flex layout styles", () => {
    const { container } = render(<Loading />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
    );
  });
});

describe("PageLoading", () => {
  it("renders loading component with text", () => {
    render(<PageLoading />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders with large size spinner", () => {
    const { container } = render(<PageLoading />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toHaveClass("h-12", "w-12");
  });

  it("applies height styling", () => {
    const { container } = render(<PageLoading />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("h-64");
  });
});
