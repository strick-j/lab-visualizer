import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { setupAdmin } from "@/api/client";

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 12,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{}|;':",./<>?`~\\]/.test(password),
  };
}

function isPasswordValid(validation: PasswordValidation): boolean {
  return Object.values(validation).every(Boolean);
}

function ValidationItem({
  label,
  met,
  show,
}: {
  label: string;
  met: boolean;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <li className={`flex items-center gap-2 text-sm ${met ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
      <span className={`inline-block h-4 w-4 rounded-full border-2 ${met ? "border-green-500 bg-green-500" : "border-gray-300 dark:border-gray-600"}`}>
        {met && (
          <svg className="h-full w-full text-white" viewBox="0 0 16 16" fill="none">
            <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </li>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const { authConfig, isLoading: authLoading, setTokens } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit =
    username.trim().length >= 3 &&
    isPasswordValid(validation) &&
    passwordsMatch &&
    !isSubmitting;

  // Redirect if setup is not required
  useEffect(() => {
    if (!authLoading && authConfig && !authConfig.setup_required) {
      navigate("/login", { replace: true });
    }
  }, [authConfig, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const tokens = await setupAdmin({
        username: username.trim(),
        password,
        confirm_password: confirmPassword,
      });

      // Auto-login with the returned tokens
      await setTokens(tokens.access_token, tokens.refresh_token || "");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError.response?.data?.detail ||
          (err instanceof Error ? err.message : "Setup failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg dark:bg-gray-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <img
                src="/visualizer-icon.svg"
                alt="Lab Visualizer"
                className="h-16 w-16"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Initial Setup
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your admin account to get started
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Admin Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={100}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                placeholder="Choose a username"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                placeholder="Create a strong password"
              />

              {/* Password requirements */}
              {passwordTouched && (
                <ul className="mt-3 space-y-1.5">
                  <ValidationItem label="At least 12 characters" met={validation.minLength} show={true} />
                  <ValidationItem label="One uppercase letter" met={validation.hasUppercase} show={true} />
                  <ValidationItem label="One lowercase letter" met={validation.hasLowercase} show={true} />
                  <ValidationItem label="One number" met={validation.hasNumber} show={true} />
                  <ValidationItem label="One special character" met={validation.hasSpecial} show={true} />
                </ul>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                placeholder="Confirm your password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
                  Passwords do not match
                </p>
              )}
              {passwordsMatch && (
                <p className="mt-1.5 text-sm text-green-600 dark:text-green-400">
                  Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isSubmitting ? "Creating account..." : "Create Admin Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
