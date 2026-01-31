import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import { RDSListPage } from "./RDSList";

const mockInstances = [
  {
    db_instance_identifier: "prod-db",
    name: "Production Database",
    engine: "mysql",
    engine_version: "8.0",
    db_instance_class: "db.t3.medium",
    allocated_storage: 100,
    display_status: "active" as const,
    multi_az: true,
    tf_managed: true,
    updated_at: "2024-01-15T12:00:00Z",
  },
  {
    db_instance_identifier: "dev-db",
    name: "Development Database",
    engine: "postgres",
    engine_version: "15.3",
    db_instance_class: "db.t3.small",
    allocated_storage: 50,
    display_status: "active" as const,
    multi_az: false,
    tf_managed: false,
    updated_at: "2024-01-14T12:00:00Z",
  },
];

let mockData = { data: mockInstances, meta: { total: 2 } };
let mockIsLoading = false;
let mockError: Error | null = null;

vi.mock("@/hooks", () => ({
  useRDSInstances: () => ({
    data: mockData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

describe("RDSListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { data: mockInstances, meta: { total: 2 } };
    mockIsLoading = false;
    mockError = null;
  });

  it("renders page title", () => {
    render(<RDSListPage />);
    expect(screen.getByText("RDS Databases")).toBeInTheDocument();
  });

  it("renders instance count", () => {
    render(<RDSListPage />);
    expect(screen.getByText("2 databases found")).toBeInTheDocument();
  });

  it("renders database names", () => {
    render(<RDSListPage />);
    expect(screen.getByText("Production Database")).toBeInTheDocument();
    expect(screen.getByText("Development Database")).toBeInTheDocument();
  });

  it("renders database identifiers", () => {
    render(<RDSListPage />);
    expect(screen.getByText("prod-db")).toBeInTheDocument();
    expect(screen.getByText("dev-db")).toBeInTheDocument();
  });

  it("renders engine info", () => {
    render(<RDSListPage />);
    expect(screen.getByText("mysql")).toBeInTheDocument();
    expect(screen.getByText("8.0")).toBeInTheDocument();
    expect(screen.getByText("postgres")).toBeInTheDocument();
    expect(screen.getByText("15.3")).toBeInTheDocument();
  });

  it("renders instance classes", () => {
    render(<RDSListPage />);
    expect(screen.getByText("db.t3.medium")).toBeInTheDocument();
    expect(screen.getByText("db.t3.small")).toBeInTheDocument();
  });

  it("renders storage info", () => {
    render(<RDSListPage />);
    expect(screen.getByText("100 GB")).toBeInTheDocument();
    expect(screen.getByText("50 GB")).toBeInTheDocument();
  });

  it("renders multi-AZ status", () => {
    render(<RDSListPage />);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders terraform badges", () => {
    render(<RDSListPage />);
    const managedBadges = screen.getAllByText("Managed");
    const unmanagedBadges = screen.getAllByText("Unmanaged");
    expect(managedBadges.length).toBeGreaterThan(0);
    expect(unmanagedBadges.length).toBeGreaterThan(0);
  });

  it("renders table headers", () => {
    render(<RDSListPage />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Engine")).toBeInTheDocument();
    expect(screen.getByText("Class")).toBeInTheDocument();
    expect(screen.getByText("Storage")).toBeInTheDocument();
    expect(screen.getByText("Multi-AZ")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockIsLoading = true;
    mockData = null as unknown as typeof mockData;
    const { container } = render(<RDSListPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockError = new Error("Failed to fetch");
    mockData = null as unknown as typeof mockData;
    render(<RDSListPage />);
    expect(screen.getByText("Error loading RDS instances")).toBeInTheDocument();
  });

  it("shows empty state when no databases", () => {
    mockData = { data: [], meta: { total: 0 } };
    render(<RDSListPage />);
    expect(screen.getByText("No RDS databases found")).toBeInTheDocument();
  });

  it("renders resource filters", () => {
    render(<RDSListPage />);
    expect(
      screen.getByPlaceholderText("Search by name or ID..."),
    ).toBeInTheDocument();
  });
});
