import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { PasswordChangeForm } from "./PasswordChangeForm";

const mockChangeUserPassword = vi.fn();

vi.mock("@/api/client", () => ({
  changeUserPassword: (...args: unknown[]) => mockChangeUserPassword(...args),
}));

describe("PasswordChangeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<PasswordChangeForm userId={1} />);

    expect(screen.getByText("Current Password")).toBeInTheDocument();
    expect(screen.getByText("New Password")).toBeInTheDocument();
    expect(screen.getByText("Confirm New Password")).toBeInTheDocument();
    expect(
      screen.getByText("Update your local account password"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change Password" }),
    ).toBeInTheDocument();
  });

  it("disables submit button when fields are empty", () => {
    render(<PasswordChangeForm userId={1} />);

    const button = screen.getByRole("button", { name: "Change Password" });
    expect(button).toBeDisabled();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm userId={1} />);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    await user.type(newPasswordInput, "short");

    expect(
      screen.getByText("Password must be at least 8 characters"),
    ).toBeInTheDocument();
  });

  it("shows mismatch error when passwords differ", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm userId={1} />);

    const newPasswordInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    await user.type(newPasswordInput, "NewPassword123");
    await user.type(confirmInput, "DifferentPassword");

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  it("enables submit button when form is valid", async () => {
    const user = userEvent.setup();
    render(<PasswordChangeForm userId={1} />);

    await user.type(
      screen.getByPlaceholderText("Enter current password"),
      "OldPassword123",
    );
    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "NewPassword456",
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "NewPassword456",
    );

    const button = screen.getByRole("button", { name: "Change Password" });
    expect(button).not.toBeDisabled();
  });

  it("calls API on submit and shows success message", async () => {
    mockChangeUserPassword.mockResolvedValue({
      id: 1,
      username: "admin",
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();

    render(<PasswordChangeForm userId={1} onSuccess={onSuccess} />);

    await user.type(
      screen.getByPlaceholderText("Enter current password"),
      "OldPassword123",
    );
    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "NewPassword456",
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "NewPassword456",
    );

    await user.click(
      screen.getByRole("button", { name: "Change Password" }),
    );

    await waitFor(() => {
      expect(mockChangeUserPassword).toHaveBeenCalledWith(1, {
        current_password: "OldPassword123",
        new_password: "NewPassword456",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Password changed successfully/),
      ).toBeInTheDocument();
    });

    expect(onSuccess).toHaveBeenCalled();
  });

  it("shows error message on API failure", async () => {
    mockChangeUserPassword.mockRejectedValue({
      response: { data: { detail: "Current password is incorrect" } },
    });
    const user = userEvent.setup();

    render(<PasswordChangeForm userId={1} />);

    await user.type(
      screen.getByPlaceholderText("Enter current password"),
      "WrongPassword",
    );
    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "NewPassword456",
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "NewPassword456",
    );

    await user.click(
      screen.getByRole("button", { name: "Change Password" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Current password is incorrect"),
      ).toBeInTheDocument();
    });
  });

  it("shows generic error when API fails without detail", async () => {
    mockChangeUserPassword.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<PasswordChangeForm userId={1} />);

    await user.type(
      screen.getByPlaceholderText("Enter current password"),
      "OldPassword123",
    );
    await user.type(
      screen.getByPlaceholderText("Enter new password"),
      "NewPassword456",
    );
    await user.type(
      screen.getByPlaceholderText("Confirm new password"),
      "NewPassword456",
    );

    await user.click(
      screen.getByRole("button", { name: "Change Password" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to change password"),
      ).toBeInTheDocument();
    });
  });

  it("clears form fields after successful submission", async () => {
    mockChangeUserPassword.mockResolvedValue({
      id: 1,
      username: "admin",
    });
    const user = userEvent.setup();

    render(<PasswordChangeForm userId={1} />);

    const currentInput = screen.getByPlaceholderText("Enter current password");
    const newInput = screen.getByPlaceholderText("Enter new password");
    const confirmInput = screen.getByPlaceholderText("Confirm new password");

    await user.type(currentInput, "OldPassword123");
    await user.type(newInput, "NewPassword456");
    await user.type(confirmInput, "NewPassword456");

    await user.click(
      screen.getByRole("button", { name: "Change Password" }),
    );

    await waitFor(() => {
      expect(currentInput).toHaveValue("");
      expect(newInput).toHaveValue("");
      expect(confirmInput).toHaveValue("");
    });
  });
});
