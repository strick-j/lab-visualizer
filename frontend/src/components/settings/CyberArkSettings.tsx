import { useState, useEffect } from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  RefreshCw,
} from "lucide-react";
import {
  getCyberArkSettings,
  updateCyberArkSettings,
  testCyberArkConnection,
  getCyberArkSyncStatus,
} from "@/api/client";
import type {
  CyberArkSettingsResponse,
  CyberArkSettingsUpdate,
  CyberArkConnectionTestResponse,
  CyberArkSyncStatus,
} from "@/types";
import { ScimSettings } from "./ScimSettings";

function SyncStatusPanel({ status }: { status: CyberArkSyncStatus }) {
  const { config, database_counts, last_sync } = status;

  const configIssues: string[] = [];
  if (!config.db_settings_exists) {
    configIssues.push("No settings saved yet — save settings first");
  } else if (!config.db_enabled) {
    configIssues.push("CyberArk is not enabled — toggle it on and save");
  } else if (!config.all_fields_set) {
    const missing: string[] = [];
    if (!config.db_base_url_set) missing.push("Base URL");
    if (!config.db_identity_url_set) missing.push("Identity URL");
    if (!config.db_client_id_set) missing.push("Client ID");
    if (!config.db_client_secret_set) missing.push("Client Secret");
    configIssues.push(`Missing fields: ${missing.join(", ")}`);
  }

  const totalResources =
    database_counts.roles_total +
    database_counts.safes +
    database_counts.accounts +
    database_counts.sia_policies +
    database_counts.users;

  const hasData = totalResources > 0;
  const hasSynced = last_sync.synced_at !== null;

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center gap-2">
        <Database className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Sync Status
        </h4>
      </div>

      {configIssues.length > 0 && (
        <div className="mb-3 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              {configIssues.map((issue, i) => (
                <p key={i}>{issue}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {configIssues.length === 0 && !hasSynced && (
        <div className="mb-3 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Configuration looks good. Click the Refresh button in the header to
            pull data from CyberArk.
          </p>
        </div>
      )}

      {configIssues.length === 0 && hasSynced && !hasData && (
        <div className="mb-3 rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Sync ran but collected 0 resources. Check the backend logs for API
              errors (authentication failures, permission issues, or unexpected
              response formats).
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="text-gray-500 dark:text-gray-400">Config source</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {config.source}
        </div>

        <div className="text-gray-500 dark:text-gray-400">Enabled</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {config.enabled ? "yes" : "no"}
        </div>

        <div className="text-gray-500 dark:text-gray-400">All fields set</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {config.all_fields_set ? "yes" : "no"}
        </div>

        <div className="col-span-2 my-1 border-t border-gray-200 dark:border-gray-700" />

        <div className="text-gray-500 dark:text-gray-400">Roles</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {database_counts.roles_active}
          {database_counts.roles_total !== database_counts.roles_active &&
            ` (${database_counts.roles_total} total)`}
        </div>

        <div className="text-gray-500 dark:text-gray-400">Safes</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {database_counts.safes}
        </div>

        <div className="text-gray-500 dark:text-gray-400">Accounts</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {database_counts.accounts}
        </div>

        <div className="text-gray-500 dark:text-gray-400">SIA Policies</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {database_counts.sia_policies}
        </div>

        <div className="text-gray-500 dark:text-gray-400">Users (SCIM)</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {database_counts.users}
        </div>

        <div className="col-span-2 my-1 border-t border-gray-200 dark:border-gray-700" />

        <div className="text-gray-500 dark:text-gray-400">Last sync</div>
        <div className="font-mono text-gray-900 dark:text-gray-100">
          {last_sync.synced_at
            ? new Date(last_sync.synced_at).toLocaleString()
            : "never"}
        </div>

        {last_sync.status && (
          <>
            <div className="text-gray-500 dark:text-gray-400">Sync result</div>
            <div className="font-mono text-gray-900 dark:text-gray-100">
              {last_sync.status} ({last_sync.resource_count} resources)
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function CyberArkSettings() {
  const [settings, setSettings] = useState<CyberArkSettingsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [identityUrl, setIdentityUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] =
    useState<CyberArkConnectionTestResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CyberArkSyncStatus | null>(null);
  const [isSyncStatusLoading, setIsSyncStatusLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadSyncStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getCyberArkSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setBaseUrl(data.base_url || "");
      setIdentityUrl(data.identity_url || "");
      setClientId(data.client_id || "");
    } catch {
      // Settings may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const loadSyncStatus = async () => {
    try {
      setIsSyncStatusLoading(true);
      const data = await getCyberArkSyncStatus();
      setSyncStatus(data);
    } catch {
      // Status endpoint may not be available
    } finally {
      setIsSyncStatusLoading(false);
    }
  };

  const handleTest = async () => {
    if (!baseUrl || !identityUrl || !clientId) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testCyberArkConnection({
        base_url: baseUrl,
        identity_url: identityUrl,
        client_id: clientId,
        client_secret: clientSecret || "existing",
      });
      setTestResult(result);
    } catch {
      setTestResult({
        success: false,
        message: "Failed to test connection",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const update: CyberArkSettingsUpdate = {
      enabled,
      base_url: baseUrl || undefined,
      identity_url: identityUrl || undefined,
      client_id: clientId || undefined,
    };

    if (clientSecret) {
      update.client_secret = clientSecret;
    }

    try {
      const data = await updateCyberArkSettings(update);
      setSettings(data);
      setSaveSuccess(true);
      setClientSecret("");
      setTimeout(() => setSaveSuccess(false), 3000);
      // Refresh sync status after save
      loadSyncStatus();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(
        axiosError.response?.data?.detail || "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Shield className="mt-1 h-8 w-8 text-purple-500" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  CyberArk Integration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Connect to CyberArk Identity, Privilege Cloud, and SIA for
                  access mapping
                </p>
              </div>
            </div>

            {/* Sync Status Panel */}
            {syncStatus && <SyncStatusPanel status={syncStatus} />}
            {isSyncStatusLoading && !syncStatus && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sync status...
              </div>
            )}
            {syncStatus && (
              <button
                onClick={loadSyncStatus}
                disabled={isSyncStatusLoading}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isSyncStatusLoading ? "animate-spin" : ""}`}
                />
                Refresh status
              </button>
            )}

            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Enable CyberArk
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enable CyberArk resource sync and access mapping
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
                  Privilege Cloud Base URL
                </label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-tenant.privilegecloud.cyberark.cloud"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Identity Tenant URL
                </label>
                <input
                  type="url"
                  value={identityUrl}
                  onChange={(e) => setIdentityUrl(e.target.value)}
                  placeholder="https://your-tenant.id.cyberark.cloud"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="your-service-account-client-id"
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
                    settings?.has_client_secret
                      ? "********"
                      : "Enter client secret"
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {settings?.has_client_secret && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    A client secret is already configured. Leave blank to keep
                    the existing secret.
                  </p>
                )}
              </div>
            </div>

            {/* Test connection */}
            <div>
              <button
                onClick={handleTest}
                disabled={!baseUrl || !identityUrl || !clientId || isTesting}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {isTesting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </span>
                ) : (
                  "Test Connection"
                )}
              </button>
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

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Settings saved successfully
                </p>
              )}
            </div>

            {settings?.updated_at && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date(settings.updated_at).toLocaleString()}
                {settings.updated_by && ` by ${settings.updated_by}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SCIM Settings */}
      <ScimSettings />
    </>
  );
}
