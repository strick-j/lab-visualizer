import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Layout } from "./Layout";

// Mock the hooks used by Header
vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: {
      last_refreshed: "2024-01-15T12:00:00Z",
      total_resources: 10,
    },
  }),
  useRefreshData: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

// Mock react-router-dom's Outlet
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet">Outlet Content</div>,
  };
});

describe("Layout", () => {
  it("renders the Header", () => {
    render(<Layout />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the Sidebar", () => {
    render(<Layout />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders the main content area", () => {
    render(<Layout />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the Outlet for child routes", () => {
    render(<Layout />);
    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("has correct structure", () => {
    const { container } = render(<Layout />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("min-h-screen");
  });
});
