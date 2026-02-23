import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { AccessMappingFilterBar } from "./AccessMappingFilterBar";
import type { AccessMappingFilters } from "./AccessMappingFilterBar";

describe("AccessMappingFilterBar", () => {
  const defaultFilters: AccessMappingFilters = {
    search: "",
    accessType: "",
    selectedUser: "",
  };

  const onChange = vi.fn();
  const users = ["john", "jane", "bob"];

  it("renders search input", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={true}
      />,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
  });

  it("renders access type selector", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    expect(screen.getByText("All Access Types")).toBeInTheDocument();
  });

  it("renders user selector for admin", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={true}
      />,
    );
    expect(screen.getByText("All Users")).toBeInTheDocument();
    expect(screen.getByText("john")).toBeInTheDocument();
    expect(screen.getByText("jane")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("hides user selector for non-admin", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    expect(screen.queryByText("All Users")).not.toBeInTheDocument();
  });

  it("calls onChange on search input", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test" } });
    expect(onChange).toHaveBeenCalledWith({
      ...defaultFilters,
      search: "test",
    });
  });

  it("shows clear button when filters active", () => {
    render(
      <AccessMappingFilterBar
        filters={{ ...defaultFilters, search: "test" }}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    const clearButton = screen.getByTitle("Clear filters");
    expect(clearButton).toBeInTheDocument();
  });

  it("hides clear button when no filters", () => {
    render(
      <AccessMappingFilterBar
        filters={defaultFilters}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    expect(screen.queryByTitle("Clear filters")).not.toBeInTheDocument();
  });

  it("clear button resets all filters", () => {
    render(
      <AccessMappingFilterBar
        filters={{ search: "test", accessType: "standing", selectedUser: "" }}
        onChange={onChange}
        users={users}
        isAdmin={false}
      />,
    );
    fireEvent.click(screen.getByTitle("Clear filters"));
    expect(onChange).toHaveBeenCalledWith({
      search: "",
      accessType: "",
      selectedUser: "",
    });
  });
});
