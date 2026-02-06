import { useState } from "react";
import { Key, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { changeUserPassword } from "@/api/client";

interface PasswordChangeFormProps {
  userId: number;
  onSuccess?: () => void;
}

export function PasswordChangeForm({
  userId,
  onSuccess,
}: PasswordChangeFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const newPasswordValid = newPassword.length >= 8;
  const canSubmit =
    currentPassword.length > 0 &&
    newPasswordValid &&
    passwordsMatch &&
    !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await changeUserPassword(userId, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess?.();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError.response?.data?.detail || "Failed to change password",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <Key className="mt-1 h-8 w-8 text-blue-500" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Change Password
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your local account password
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {newPassword.length > 0 && !newPasswordValid && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Password must be at least 8 characters
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Passwords do not match
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Changing...
                </span>
              ) : (
                "Change Password"
              )}
            </button>

            {error && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Password changed successfully. You may need to log in again.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
