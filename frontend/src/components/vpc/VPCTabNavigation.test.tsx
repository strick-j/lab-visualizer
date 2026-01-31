import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { VPCTabNavigation } from "./VPCTabNavigation";

describe("VPCTabNavigation", () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all tabs", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    expect(screen.getByText("VPCs")).toBeInTheDocument();
    expect(screen.getByText("Subnets")).toBeInTheDocument();
    expect(screen.getByText("Internet Gateways")).toBeInTheDocument();
    expect(screen.getByText("NAT Gateways")).toBeInTheDocument();
    expect(screen.getByText("Elastic IPs")).toBeInTheDocument();
  });

  it("renders navigation element", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders all tabs as buttons", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("calls onTabChange when tab is clicked", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    fireEvent.click(screen.getByText("Subnets"));
    expect(mockOnTabChange).toHaveBeenCalledWith("subnets");
  });

  it("calls onTabChange with correct tab key for each tab", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    fireEvent.click(screen.getByText("VPCs"));
    expect(mockOnTabChange).toHaveBeenCalledWith("vpcs");

    fireEvent.click(screen.getByText("Internet Gateways"));
    expect(mockOnTabChange).toHaveBeenCalledWith("internet-gateways");

    fireEvent.click(screen.getByText("NAT Gateways"));
    expect(mockOnTabChange).toHaveBeenCalledWith("nat-gateways");

    fireEvent.click(screen.getByText("Elastic IPs"));
    expect(mockOnTabChange).toHaveBeenCalledWith("elastic-ips");
  });

  it("applies active styling to active tab", () => {
    render(
      <VPCTabNavigation activeTab="subnets" onTabChange={mockOnTabChange} />,
    );

    const subnetsTab = screen.getByText("Subnets").closest("button");
    expect(subnetsTab).toHaveClass("border-blue-500");
    expect(subnetsTab).toHaveClass("text-blue-600");
  });

  it("applies inactive styling to inactive tabs", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    const subnetsTab = screen.getByText("Subnets").closest("button");
    expect(subnetsTab).toHaveClass("border-transparent");
    expect(subnetsTab).toHaveClass("text-gray-500");
  });

  it("renders icons for each tab", () => {
    const { container } = render(
      <VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />,
    );

    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(5);
  });

  it("shows VPCs tab as active when activeTab is vpcs", () => {
    render(<VPCTabNavigation activeTab="vpcs" onTabChange={mockOnTabChange} />);

    const vpcsTab = screen.getByText("VPCs").closest("button");
    expect(vpcsTab).toHaveClass("border-blue-500");
  });

  it("shows Elastic IPs tab as active when activeTab is elastic-ips", () => {
    render(
      <VPCTabNavigation
        activeTab="elastic-ips"
        onTabChange={mockOnTabChange}
      />,
    );

    const elasticIpsTab = screen.getByText("Elastic IPs").closest("button");
    expect(elasticIpsTab).toHaveClass("border-blue-500");
  });
});
