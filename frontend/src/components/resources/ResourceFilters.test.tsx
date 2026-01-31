import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ResourceFilters } from "./ResourceFilters";

describe("ResourceFilters", () => {
  const mockOnFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders search input", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );
    expect(
      screen.getByPlaceholderText("Search by name or ID..."),
    ).toBeInTheDocument();
  });

  it("renders status select", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );
    expect(screen.getByText("All statuses")).toBeInTheDocument();
  });

  it("renders terraform filter by default", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );
    expect(screen.getByText("All resources")).toBeInTheDocument();
  });

  it("hides terraform filter when showTerraformFilter is false", () => {
    render(
      <ResourceFilters
        filters={{}}
        onFilterChange={mockOnFilterChange}
        showTerraformFilter={false}
      />,
    );
    expect(screen.queryByText("All resources")).not.toBeInTheDocument();
  });

  it("shows clear button when filters are active", () => {
    render(
      <ResourceFilters
        filters={{ search: "test" }}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("does not show clear button when no filters are active", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument();
  });

  it("calls onFilterChange when status is selected", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );

    // Get all comboboxes - first one is status, second is terraform
    const selects = screen.getAllByRole("combobox");
    const statusSelect = selects[0];
    fireEvent.change(statusSelect, { target: { value: "active" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      status: "active",
    });
  });

  it("calls onFilterChange when terraform filter is selected", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );

    const selects = screen.getAllByRole("combobox");
    const terraformSelect = selects[1];
    fireEvent.change(terraformSelect, { target: { value: "true" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      tf_managed: true,
    });
  });

  it("debounces search input", async () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );

    const searchInput = screen.getByPlaceholderText("Search by name or ID...");
    fireEvent.change(searchInput, { target: { value: "test" } });

    // Should not be called immediately
    expect(mockOnFilterChange).not.toHaveBeenCalled();

    // Fast forward debounce timer
    vi.advanceTimersByTime(400);

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      search: "test",
    });
  });

  it("clears all filters when clear button is clicked", () => {
    render(
      <ResourceFilters
        filters={{ search: "test", status: "active" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    fireEvent.click(screen.getByText("Clear filters"));

    expect(mockOnFilterChange).toHaveBeenCalledWith({});
  });

  it("displays current search value", () => {
    render(
      <ResourceFilters
        filters={{ search: "my search" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByDisplayValue("my search")).toBeInTheDocument();
  });

  it("syncs search input with external filter changes", () => {
    const { rerender } = render(
      <ResourceFilters
        filters={{ search: "initial" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByDisplayValue("initial")).toBeInTheDocument();

    rerender(
      <ResourceFilters
        filters={{ search: "updated" }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    expect(screen.getByDisplayValue("updated")).toBeInTheDocument();
  });

  it("shows clear button when status filter is active", () => {
    render(
      <ResourceFilters
        filters={{ status: "active" }}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("shows clear button when tf_managed filter is active", () => {
    render(
      <ResourceFilters
        filters={{ tf_managed: true }}
        onFilterChange={mockOnFilterChange}
      />,
    );
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });

  it("sets tf_managed to false when unmanaged is selected", () => {
    render(
      <ResourceFilters filters={{}} onFilterChange={mockOnFilterChange} />,
    );

    const selects = screen.getAllByRole("combobox");
    const terraformSelect = selects[1];
    fireEvent.change(terraformSelect, { target: { value: "false" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      tf_managed: false,
    });
  });

  it("clears tf_managed when empty value is selected", () => {
    render(
      <ResourceFilters
        filters={{ tf_managed: true }}
        onFilterChange={mockOnFilterChange}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    const terraformSelect = selects[1];
    fireEvent.change(terraformSelect, { target: { value: "" } });

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      tf_managed: undefined,
    });
  });
});
