import { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Key,
  AlertCircle,
  CheckCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAuthSettings,
  updateOIDCSettings,
  testOIDCConnection,
} from "@/api/client";
import { PasswordChangeForm } from "@/components/common/PasswordChangeForm";
import {
  SettingsTabNavigation,
  type SettingsTabType,
} from "@/components/settings/SettingsTabNavigation";
import type {
  AuthSettingsResponse,
  OIDCSettingsUpdate,
  TestConnectionResponse,
} from "@/types";
import { TerraformBucketsSettings } from "@/components/settings/TerraformBucketsSettings";

export function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AuthSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTabType>("authentication");

  // Check if user is admin
  const isAdmin = user?.is_admin ?? false;
  const isLocalUser = user?.auth_provider === "local";

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const loadSettings = async (showSpinner = true) => {
    try {
      if (showSpinner) setIsLoading(true);
      setError(null);
      const data = await getAuthSettings();
      setSettings(data);
    } catch {
      setError("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Non-admin users: show password change form (if local) + admin required notice
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Application settings and configuration
          </p>
        </div>

        {/* Password change for non-admin local users */}
        {isLocalUser && user && (
          <PasswordChangeForm userId={user.id} onSuccess={logout} />
        )}

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200">
              Admin privileges required to access additional settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Application settings and configuration
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
          <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure authentication providers and S3 bucket sources
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <SettingsTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div>
        {activeTab === "authentication" && (
          <div className="space-y-6">
            {/* Password Change (for local admin users) */}
            {isLocalUser && user && (
              <PasswordChangeForm userId={user.id} onSuccess={logout} />
            )}

            {/* Local Auth Status */}
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      Local Authentication
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Username and password authentication
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    settings?.local_auth_enabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {settings?.local_auth_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            {/* OIDC Configuration */}
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <div className="p-6">
                {settings && (
                  <OIDCSettingsForm
                    settings={settings.oidc}
                    onUpdate={() => loadSettings(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "s3-buckets" && (
          <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="p-6">
              <TerraformBucketsSettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface OIDCSettingsFormProps {
  settings: AuthSettingsResponse["oidc"];
  onUpdate: () => void;
}

function OIDCSettingsForm({ settings, onUpdate }: OIDCSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [issuer, setIssuer] = useState(settings.issuer || "");
  const [clientId, setClientId] = useState(settings.client_id || "");
  const [clientSecret, setClientSecret] = useState("");
  const [displayName, setDisplayName] = useState(
    settings.display_name || "OIDC",
  );
  const [accessTokenExpireMinutes, setAccessTokenExpireMinutes] = useState(
    settings.access_token_expire_minutes,
  );
  const [refreshTokenExpireDays, setRefreshTokenExpireDays] = useState(
    settings.refresh_token_expire_days,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(
    null,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Generate the OIDC callback URL based on current origin
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/oidc/callback`
      : "/api/auth/oidc/callback";

  const handleCopyCallback = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = callbackUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedCallback(true);
      setTimeout(() => setCopiedCallback(false), 2000);
    }
  };

  const handleTest = async () => {
    if (!issuer) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testOIDCConnection(issuer);
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: "Failed to test connection" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const update: OIDCSettingsUpdate = {
      enabled,
      issuer: issuer || undefined,
      client_id: clientId || undefined,
      display_name: displayName || undefined,
      access_token_expire_minutes: accessTokenExpireMinutes,
      refresh_token_expire_days: refreshTokenExpireDays,
    };

    // Only include client secret if it was changed
    if (clientSecret) {
      update.client_secret = clientSecret;
    }

    try {
      await updateOIDCSettings(update);
      setSaveSuccess(true);
      setClientSecret(""); // Clear secret after save
      onUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(
        axiosError.response?.data?.detail || "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Shield className="mt-1 h-8 w-8 text-blue-500" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            OpenID Connect (OIDC)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure OIDC authentication with providers like Okta, Azure AD,
            Google, or Auth0
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Enable OIDC
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Allow users to sign in with OIDC
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Configuration fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Issuer URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="https://your-domain.okta.com"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={handleTest}
              disabled={!issuer || isTesting}
              className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Test"
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The OIDC issuer URL (e.g., https://your-domain.okta.com)
          </p>
        </div>

        {testResult && (
          <div
            className={`rounded-md p-3 ${
              testResult.success
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-red-50 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <p
                className={`text-sm ${
                  testResult.success
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {testResult.message}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="your-client-id"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Client Secret
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={
              settings.client_secret_configured
                ? "********"
                : "Enter client secret"
            }
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {settings.client_secret_configured && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A client secret is already configured. Leave blank to keep the
              existing secret.
            </p>
          )}
        </div>

        {/* Callback URL - for IdP configuration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Callback URL (Redirect URI)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={callbackUrl}
              readOnly
              className="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
            />
            <button
              onClick={handleCopyCallback}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              title="Copy to clipboard"
            >
              {copiedCallback ? (
                <>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-green-600 dark:text-green-400">
                    Copied
                  </span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Add this URL to your Identity Provider&apos;s allowed redirect URIs
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Sign in with Okta"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Text shown on the login button
          </p>
        </div>

        {/* Token Expiration Settings */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            Token Expiration
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Access Token Expiry (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={1440}
                value={accessTokenExpireMinutes}
                onChange={(e) =>
                  setAccessTokenExpireMinutes(Number(e.target.value))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                1-1440 minutes (default: 30)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Refresh Token Expiry (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={refreshTokenExpireDays}
                onChange={(e) =>
                  setRefreshTokenExpireDays(Number(e.target.value))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                1-365 days (default: 7)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save button and messages */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">
            Settings saved successfully
          </p>
        )}
      </div>

      {settings.updated_at && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(settings.updated_at).toLocaleString()}
          {settings.updated_by && ` by ${settings.updated_by}`}
        </p>
      )}
    </div>
  );
}
