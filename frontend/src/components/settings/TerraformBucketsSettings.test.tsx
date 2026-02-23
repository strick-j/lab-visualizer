import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { TerraformBucketsSettings } from "./TerraformBucketsSettings";
import type { TerraformBucket } from "@/types";

// Mock API client
const mockGetTerraformBuckets = vi.fn();
const mockCreateTerraformBucket = vi.fn();
const mockUpdateTerraformBucket = vi.fn();
const mockDeleteTerraformBucket = vi.fn();
const mockCreateTerraformPath = vi.fn();
const mockDeleteTerraformPath = vi.fn();
const mockUpdateTerraformPath = vi.fn();
const mockTestS3Bucket = vi.fn();
const mockListS3BucketObjects = vi.fn();

vi.mock("@/api/client", () => ({
  getTerraformBuckets: (...args: unknown[]) => mockGetTerraformBuckets(...args),
  createTerraformBucket: (...args: unknown[]) =>
    mockCreateTerraformBucket(...args),
  updateTerraformBucket: (...args: unknown[]) =>
    mockUpdateTerraformBucket(...args),
  deleteTerraformBucket: (...args: unknown[]) =>
    mockDeleteTerraformBucket(...args),
  createTerraformPath: (...args: unknown[]) => mockCreateTerraformPath(...args),
  deleteTerraformPath: (...args: unknown[]) => mockDeleteTerraformPath(...args),
  updateTerraformPath: (...args: unknown[]) => mockUpdateTerraformPath(...args),
  testS3Bucket: (...args: unknown[]) => mockTestS3Bucket(...args),
  listS3BucketObjects: (...args: unknown[]) => mockListS3BucketObjects(...args),
}));

const makeBucket = (overrides?: Partial<TerraformBucket>): TerraformBucket => ({
  id: 1,
  bucket_name: "my-tf-state-bucket",
  region: "us-east-1",
  description: "Production state files",
  prefix: "lab/",
  excluded_paths: null,
  enabled: true,
  source: "admin",
  paths: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-15T00:00:00Z",
  ...overrides,
});

const bucketWithPaths = makeBucket({
  paths: [
    {
      id: 10,
      bucket_id: 1,
      path: "env/prod/terraform.tfstate",
      description: "Production",
      enabled: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-06-15T00:00:00Z",
    },
    {
      id: 11,
      bucket_id: 1,
      path: "env/dev/terraform.tfstate",
      description: null,
      enabled: false,
      created_at: "2024-02-01T00:00:00Z",
      updated_at: "2024-06-15T00:00:00Z",
    },
  ],
});

describe("TerraformBucketsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTerraformBuckets.mockResolvedValue({
      buckets: [makeBucket()],
      total: 1,
    });
  });

  it("shows loading spinner on mount", () => {
    mockGetTerraformBuckets.mockImplementation(() => new Promise(() => {}));

    render(<TerraformBucketsSettings />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders bucket cards after fetch", async () => {
    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText(/Region: us-east-1/)).toBeInTheDocument();
  });

  it("shows empty state when no buckets", async () => {
    mockGetTerraformBuckets.mockResolvedValue({ buckets: [], total: 0 });

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(
        screen.getByText("No Terraform state buckets configured"),
      ).toBeInTheDocument();
    });
  });

  it("shows error on fetch failure", async () => {
    mockGetTerraformBuckets.mockRejectedValue(new Error("Network error"));

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load Terraform state buckets"),
      ).toBeInTheDocument();
    });
  });

  it('"Add S3 Bucket" button shows add form', async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add S3 Bucket/i }));

    expect(
      screen.getByPlaceholderText("my-terraform-state-bucket"),
    ).toBeInTheDocument();
  });

  it("add form: fill fields and submit calls createTerraformBucket", async () => {
    const user = userEvent.setup();
    const newBucket = makeBucket({
      id: 2,
      bucket_name: "new-bucket",
      region: "us-west-2",
      description: "",
      prefix: null,
    });
    mockCreateTerraformBucket.mockResolvedValue(newBucket);

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add S3 Bucket/i }));

    await user.type(
      screen.getByPlaceholderText("my-terraform-state-bucket"),
      "new-bucket",
    );
    await user.type(
      screen.getByPlaceholderText("us-east-1 (optional)"),
      "us-west-2",
    );

    await user.click(screen.getByRole("button", { name: "Add Bucket" }));

    await waitFor(() => {
      expect(mockCreateTerraformBucket).toHaveBeenCalledWith(
        expect.objectContaining({
          bucket_name: "new-bucket",
          region: "us-west-2",
        }),
      );
    });
  });

  it("add form: cancel hides form", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add S3 Bucket/i }));
    expect(
      screen.getByPlaceholderText("my-terraform-state-bucket"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByPlaceholderText("my-terraform-state-bucket"),
    ).not.toBeInTheDocument();
  });

  it("add form: shows error on save failure", async () => {
    const user = userEvent.setup();
    mockCreateTerraformBucket.mockRejectedValue({
      response: { data: { detail: "Bucket already exists" } },
    });

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Add S3 Bucket/i }));

    await user.type(
      screen.getByPlaceholderText("my-terraform-state-bucket"),
      "duplicate-bucket",
    );

    await user.click(screen.getByRole("button", { name: "Add Bucket" }));

    await waitFor(() => {
      expect(screen.getByText("Bucket already exists")).toBeInTheDocument();
    });
  });

  it("delete bucket: click delete then confirm calls deleteTerraformBucket", async () => {
    const user = userEvent.setup();
    mockDeleteTerraformBucket.mockResolvedValue(undefined);

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    // Click the delete button (Trash2 icon)
    await user.click(screen.getByTitle("Delete"));

    // Confirm deletion
    await user.click(screen.getByTitle("Confirm delete"));

    await waitFor(() => {
      expect(mockDeleteTerraformBucket).toHaveBeenCalledWith(1);
    });
  });

  it("delete bucket: cancel hides confirm buttons", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Delete"));

    // Confirm and Cancel buttons should appear
    expect(screen.getByTitle("Confirm delete")).toBeInTheDocument();
    expect(screen.getByTitle("Cancel")).toBeInTheDocument();

    await user.click(screen.getByTitle("Cancel"));

    // Should go back to showing the Delete button
    expect(screen.queryByTitle("Confirm delete")).not.toBeInTheDocument();
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("toggle enabled calls updateTerraformBucket", async () => {
    const user = userEvent.setup();
    const updated = makeBucket({ enabled: false });
    mockUpdateTerraformBucket.mockResolvedValue(updated);

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Disable"));

    await waitFor(() => {
      expect(mockUpdateTerraformBucket).toHaveBeenCalledWith(1, {
        enabled: false,
      });
    });
  });

  it("edit button shows edit form with pre-filled values", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Edit"));

    // Should show edit form with existing values
    expect(screen.getByText("Edit Bucket")).toBeInTheDocument();
    expect(screen.getByDisplayValue("my-tf-state-bucket")).toBeInTheDocument();
    expect(screen.getByDisplayValue("us-east-1")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Production state files"),
    ).toBeInTheDocument();
  });

  it("edit form: save calls updateTerraformBucket and exits edit mode", async () => {
    const user = userEvent.setup();
    const updated = makeBucket({ description: "Updated description" });
    mockUpdateTerraformBucket.mockResolvedValue(updated);

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Edit"));

    const descInput = screen.getByDisplayValue("Production state files");
    await user.clear(descInput);
    await user.type(descInput, "Updated description");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdateTerraformBucket).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          description: "Updated description",
        }),
      );
    });

    // Edit form should be gone
    await waitFor(() => {
      expect(screen.queryByText("Edit Bucket")).not.toBeInTheDocument();
    });
  });

  it("edit form: cancel exits edit mode", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Edit"));
    expect(screen.getByText("Edit Bucket")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Edit Bucket")).not.toBeInTheDocument();
  });

  it("test connectivity: shows success banner", async () => {
    const user = userEvent.setup();
    mockTestS3Bucket.mockResolvedValue({
      success: true,
      message: "Bucket accessible",
      details: { region: "us-east-1" },
    });

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Test connectivity"));

    await waitFor(() => {
      expect(screen.getByText("Bucket accessible")).toBeInTheDocument();
    });
  });

  it("test connectivity: shows failure banner", async () => {
    const user = userEvent.setup();
    mockTestS3Bucket.mockRejectedValue(new Error("No access"));

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Test connectivity"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to test bucket connectivity"),
      ).toBeInTheDocument();
    });
  });

  it("expand bucket shows paths section", async () => {
    const user = userEvent.setup();
    mockGetTerraformBuckets.mockResolvedValue({
      buckets: [bucketWithPaths],
      total: 1,
    });

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    // Click the expand chevron
    const expandButtons = document.querySelectorAll("button");
    const chevronButton = Array.from(expandButtons).find(
      (btn) =>
        btn.querySelector("svg") &&
        btn.className.includes("text-gray-400") &&
        btn.className.includes("hover:text-gray-600"),
    );
    expect(chevronButton).toBeTruthy();
    await user.click(chevronButton!);

    await waitFor(() => {
      expect(screen.getByText("State File Paths")).toBeInTheDocument();
    });

    expect(screen.getByText("env/prod/terraform.tfstate")).toBeInTheDocument();
    expect(screen.getByText("env/dev/terraform.tfstate")).toBeInTheDocument();
  });

  it("expanded with no paths shows auto-discovery message", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    // Bucket has no paths
    expect(screen.getByText("Auto-discovery")).toBeInTheDocument();

    // Expand the bucket
    const expandButtons = document.querySelectorAll("button");
    const chevronButton = Array.from(expandButtons).find(
      (btn) =>
        btn.querySelector("svg") &&
        btn.className.includes("text-gray-400") &&
        btn.className.includes("hover:text-gray-600"),
    );
    await user.click(chevronButton!);

    await waitFor(() => {
      expect(screen.getByText("State File Paths")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No explicit paths configured/),
    ).toBeInTheDocument();
  });

  it("add path: click shows form, submit calls createTerraformPath", async () => {
    const user = userEvent.setup();

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    // Expand the bucket
    const expandButtons = document.querySelectorAll("button");
    const chevronButton = Array.from(expandButtons).find(
      (btn) =>
        btn.querySelector("svg") &&
        btn.className.includes("text-gray-400") &&
        btn.className.includes("hover:text-gray-600"),
    );
    await user.click(chevronButton!);

    await waitFor(() => {
      expect(screen.getByText("Add Path")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Add Path"));

    const pathInput = screen.getByPlaceholderText(
      "env/production/terraform.tfstate",
    );
    expect(pathInput).toBeInTheDocument();

    const createdPath = {
      id: 20,
      bucket_id: 1,
      path: "env/staging/terraform.tfstate",
      description: null,
      enabled: true,
      created_at: "2024-06-15T00:00:00Z",
      updated_at: "2024-06-15T00:00:00Z",
    };
    mockCreateTerraformPath.mockResolvedValue(createdPath);

    await user.type(pathInput, "env/staging/terraform.tfstate");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(mockCreateTerraformPath).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          path: "env/staging/terraform.tfstate",
          enabled: true,
        }),
      );
    });
  });

  it("ENV bucket: no delete button, bucket name disabled in edit form", async () => {
    const user = userEvent.setup();
    const envBucket = makeBucket({ source: "env" });
    mockGetTerraformBuckets.mockResolvedValue({
      buckets: [envBucket],
      total: 1,
    });

    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    // Should show ENV badge
    expect(screen.getByText("ENV")).toBeInTheDocument();

    // Should not have Delete button
    expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();

    // Edit form should have disabled bucket name
    await user.click(screen.getByTitle("Edit"));

    const bucketNameInput = screen.getByDisplayValue("my-tf-state-bucket");
    expect(bucketNameInput).toBeDisabled();
    expect(
      screen.getByText(
        /Bucket name is set by the TF_STATE_BUCKET environment variable/,
      ),
    ).toBeInTheDocument();
  });

  it("shows description and prefix metadata", async () => {
    render(<TerraformBucketsSettings />);

    await waitFor(() => {
      expect(screen.getByText("my-tf-state-bucket")).toBeInTheDocument();
    });

    expect(screen.getByText("Production state files")).toBeInTheDocument();
    expect(screen.getByText("lab/")).toBeInTheDocument();
  });
});
