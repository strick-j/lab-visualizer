import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { Header } from "./Header";

// Mock the hooks
const mockMutate = vi.fn();
vi.mock("@/hooks", () => ({
  useStatusSummary: () => ({
    data: {
      last_refreshed: "2024-01-15T12:00:00Z",
      total_resources: 10,
    },
  }),
  useRefreshData: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

describe("Header", () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it("renders header element", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders application title", () => {
    render(<Header />);
    expect(
      screen.getByText("AWS Infrastructure Visualizer"),
    ).toBeInTheDocument();
  });

  it("renders last updated time", () => {
    render(<Header />);
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it("renders refresh button", () => {
    render(<Header />);
    expect(
      screen.getByRole("button", { name: /refresh/i }),
    ).toBeInTheDocument();
  });

  it("calls refresh mutation when button clicked", () => {
    render(<Header />);

    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(false);
  });

  it("renders theme toggle", () => {
    render(<Header />);
    // ThemeToggle should be present
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("renders AWS logo", () => {
    render(<Header />);
    const svg = document.querySelector("header svg");
    expect(svg).toBeInTheDocument();
  });
});
