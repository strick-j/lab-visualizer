import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parse tokens from URL fragment
    const hash = window.location.hash.substring(1); // Remove the '#'
    if (!hash) {
      setError("No authentication data received");
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Invalid authentication response");
      return;
    }

    // Store tokens and redirect to dashboard
    setTokens(accessToken, refreshToken);

    // Clear the URL fragment for security
    window.history.replaceState(null, "", window.location.pathname);

    // Navigate to dashboard
    navigate("/", { replace: true });
  }, [navigate, setTokens]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="rounded-lg bg-white px-8 py-10 shadow-lg dark:bg-gray-800">
            <h1 className="text-xl font-bold text-red-600 dark:text-red-400">
              Authentication Failed
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-400">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Completing authentication...
        </p>
      </div>
    </div>
  );
}
