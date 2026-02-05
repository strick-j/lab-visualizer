import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { initiateOIDCLogin } from '@/api/client';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError, authConfig } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Get the redirect path from location state, default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, from]);

  const handleLocalLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    clearError();

    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOIDCLogin = async () => {
    setLocalError(null);
    clearError();

    try {
      const response = await initiateOIDCLogin();
      // Store state for CSRF verification
      sessionStorage.setItem('oidc_state', response.state);
      // Redirect to IdP
      window.location.href = response.auth_url;
    } catch (err) {
      setLocalError('Failed to initiate OIDC login');
    }
  };

  // Show loading spinner while checking auth state
  if (isLoading && !isSubmitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const displayError = error || localError;
  const hasMultipleAuthMethods =
    authConfig &&
    [authConfig.local_auth_enabled, authConfig.oidc_enabled].filter(
      Boolean
    ).length > 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white px-8 py-10 shadow-lg dark:bg-gray-800">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              AWS Infrastructure Visualizer
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Sign in to access the dashboard
            </p>
          </div>

          {/* Error message */}
          {displayError && (
            <div className="mb-6 rounded-md bg-red-50 p-4 dark:bg-red-900/20">
              <p className="text-sm text-red-700 dark:text-red-400">{displayError}</p>
            </div>
          )}

          {/* Local login form */}
          {authConfig?.local_auth_enabled && (
            <form onSubmit={handleLocalLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                  placeholder="Enter your username"
                />
              </div>

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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 dark:disabled:bg-gray-800"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Divider for multiple auth methods */}
          {hasMultipleAuthMethods && authConfig?.local_auth_enabled && (
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
              <span className="px-4 text-sm text-gray-500 dark:text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
            </div>
          )}

          {/* SSO buttons */}
          <div className="space-y-3">
            {authConfig?.oidc_enabled && (
              <button
                onClick={handleOIDCLogin}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 2.18c5.416 0 9.82 4.404 9.82 9.82s-4.404 9.82-9.82 9.82-9.82-4.404-9.82-9.82S6.584 2.18 12 2.18zm0 2.545a7.275 7.275 0 100 14.55 7.275 7.275 0 000-14.55zm0 2.182a5.093 5.093 0 110 10.186 5.093 5.093 0 010-10.186z" />
                </svg>
                Sign in with {authConfig.oidc_display_name || 'OIDC'}
              </button>
            )}
          </div>

          {/* No auth methods available message */}
          {authConfig &&
            !authConfig.local_auth_enabled &&
            !authConfig.oidc_enabled && (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No authentication methods are configured.
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
                  Please contact your administrator.
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
