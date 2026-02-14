import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ZoomControls } from "./ZoomControls";

const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockFitView = vi.fn();

vi.mock("reactflow", () => ({
  useReactFlow: () => ({
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    fitView: mockFitView,
  }),
  useStore: (selector: (state: { transform: number[] }) => number) =>
    selector({ transform: [0, 0, 0.75] }),
}));

describe("ZoomControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders zoom in, zoom out, and fit view buttons", () => {
    render(<ZoomControls />);
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Fit to view")).toBeInTheDocument();
  });

  it("displays the current zoom percentage", () => {
    render(<ZoomControls />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("calls zoomOut when minus button is clicked", () => {
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(mockZoomOut).toHaveBeenCalledTimes(1);
  });

  it("calls zoomIn when plus button is clicked", () => {
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(mockZoomIn).toHaveBeenCalledTimes(1);
  });

  it("calls fitView when fit-to-view button is clicked", () => {
    render(<ZoomControls />);
    fireEvent.click(screen.getByLabelText("Fit to view"));
    expect(mockFitView).toHaveBeenCalledTimes(1);
    expect(mockFitView).toHaveBeenCalledWith({ duration: 300, padding: 0.2 });
  });

  it("applies custom className", () => {
    const { container } = render(<ZoomControls className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-class")).toBe(true);
  });
});
