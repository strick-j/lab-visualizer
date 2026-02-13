import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/test-utils";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  it("renders navigation links", () => {
    render(<Sidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Topology")).toBeInTheDocument();
    expect(screen.getByText("EC2 Instances")).toBeInTheDocument();
    expect(screen.getByText("RDS Databases")).toBeInTheDocument();
    expect(screen.getByText("ECS Containers")).toBeInTheDocument();
    expect(screen.getByText("VPC Networking")).toBeInTheDocument();
    expect(screen.getByText("Terraform")).toBeInTheDocument();
  });

  it("renders settings link", () => {
    render(<Sidebar />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders as aside element", () => {
    render(<Sidebar />);
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("renders navigation element", () => {
    render(<Sidebar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("links have correct hrefs", () => {
    render(<Sidebar />);

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Topology").closest("a")).toHaveAttribute(
      "href",
      "/topology",
    );
    expect(screen.getByText("EC2 Instances").closest("a")).toHaveAttribute(
      "href",
      "/ec2",
    );
    expect(screen.getByText("RDS Databases").closest("a")).toHaveAttribute(
      "href",
      "/rds",
    );
    expect(screen.getByText("ECS Containers").closest("a")).toHaveAttribute(
      "href",
      "/ecs",
    );
    expect(screen.getByText("VPC Networking").closest("a")).toHaveAttribute(
      "href",
      "/vpc",
    );
    expect(screen.getByText("Terraform").closest("a")).toHaveAttribute(
      "href",
      "/terraform",
    );
    expect(screen.getByText("Settings").closest("a")).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("each navigation item has an icon", () => {
    render(<Sidebar />);
    const links = screen.getAllByRole("link");

    links.forEach((link) => {
      const svg = link.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
