import { useState, useEffect } from "react";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Database,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  getCyberArkSettings,
  updateCyberArkSettings,
  testCyberArkConnection,
  getCyberArkSyncStatus,
  discoverCyberArkTenant,
  getScimSettings,
  updateScimSettings,
  testScimConnection,
} from "@/api/client";
import type {
  CyberArkSettingsResponse,
  CyberArkSettingsUpdate,
  CyberArkConnectionTestResponse,
  CyberArkSyncStatus,
  ScimSettingsResponse,
  ScimSettingsUpdate,
  ScimConnectionTestResponse,
} from "@/types";

function SyncStatusPanel({
  status,
  isLoading,
  onRefresh,
}: {
  status: CyberArkSyncStatus;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { config, database_counts, last_sync } = status;

  const totalResources =
    database_counts.roles_total +
    database_counts.safes +
    database_counts.accounts +
    database_counts.sia_policies +
    database_counts.users;

  const hasSynced = last_sync.synced_at !== null;

  // Build a short summary line
  const summaryParts: string[] = [];
  if (!config.db_settings_exists) {
    summaryParts.push("Not configured");
  } else if (!config.db_enabled) {
    summaryParts.push("Disabled");
  } else if (hasSynced) {
    summaryParts.push(`${totalResources} resources`);
    if (last_sync.synced_at) {
      summaryParts.push(
        `synced ${new Date(last_sync.synced_at).toLocaleString()}`,
      );
    }
  } else {
    summaryParts.push("Ready — click Refresh to sync");
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Sync Status
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {summaryParts.join(" · ")}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          {!config.db_settings_exists && (
            <div className="mb-3 rounded-md bg-yellow-50 p-2 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No settings saved yet — save settings first
              </p>
            </div>
          )}

          {config.db_settings_exists &&
            config.db_enabled &&
            !config.all_fields_set && (
              <div className="mb-3 rounded-md bg-yellow-50 p-2 dark:bg-yellow-900/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Missing required fields — check configuration below
                  </p>
                </div>
              </div>
            )}

          {config.all_fields_set && hasSynced && totalResources === 0 && (
            <div className="mb-3 rounded-md bg-yellow-50 p-2 dark:bg-yellow-900/20">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Sync ran but collected 0 resources. Check backend logs.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="text-gray-500 dark:text-gray-400">Source</div>
            <div className="font-mono text-gray-900 dark:text-gray-100">
              {config.source}
            </div>

            <div className="text-gray-500 dark:text-gray-400">Enabled</div>
            <div className="font-mono text-gray-900 dark:text-gray-100">
              {config.enabled ? "yes" : "no"}
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
                <div className="text-gray-500 dark:text-gray-400">Result</div>
                <div className="font-mono text-gray-900 dark:text-gray-100">
                  {last_sync.status} ({last_sync.resource_count} resources)
                </div>
              </>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <RefreshCw
              className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh status
          </button>
        </div>
      )}
    </div>
  );
}

function TestResultBanner({
  result,
}: {
  result: { success: boolean; message: string } | null;
}) {
  if (!result) return null;
  return (
    <div
      className={`rounded-md p-2 ${
        result.success
          ? "bg-green-50 dark:bg-green-900/20"
          : "bg-red-50 dark:bg-red-900/20"
      }`}
    >
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
        <p
          className={`text-sm ${
            result.success
              ? "text-green-800 dark:text-green-200"
              : "text-red-800 dark:text-red-200"
          }`}
        >
          {result.message}
        </p>
      </div>
    </div>
  );
}

export function CyberArkSettings() {
  // Platform settings state
  const [settings, setSettings] = useState<CyberArkSettingsResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [identityUrl, setIdentityUrl] = useState("");
  const [uapBaseUrl, setUapBaseUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] =
    useState<CyberArkConnectionTestResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tenant discovery state
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoveryRegion, setDiscoveryRegion] = useState<string | null>(null);

  // SCIM settings state
  const [scimSettings, setScimSettings] = useState<ScimSettingsResponse | null>(
    null,
  );
  const [scimEnabled, setScimEnabled] = useState(false);
  const [scimAppId, setScimAppId] = useState("");
  const [scimScope, setScimScope] = useState("");
  const [scimClientId, setScimClientId] = useState("");
  const [scimClientSecret, setScimClientSecret] = useState("");
  const [isScimSaving, setIsScimSaving] = useState(false);
  const [isScimTesting, setIsScimTesting] = useState(false);
  const [scimTestResult, setScimTestResult] =
    useState<ScimConnectionTestResponse | null>(null);
  const [scimSaveError, setScimSaveError] = useState<string | null>(null);
  const [scimSaveSuccess, setScimSaveSuccess] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<CyberArkSyncStatus | null>(null);
  const [isSyncStatusLoading, setIsSyncStatusLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadScimSettings();
    loadSyncStatus();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await getCyberArkSettings();
      setSettings(data);
      setEnabled(data.enabled);
      setTenantName(data.tenant_name || "");
      setBaseUrl(data.base_url || "");
      setIdentityUrl(data.identity_url || "");
      setUapBaseUrl(data.uap_base_url || "");
      setClientId(data.client_id || "");
    } catch {
      // Settings may not exist yet
    } finally {
      setIsLoading(false);
    }
  };

  const loadScimSettings = async () => {
    try {
      const data = await getScimSettings();
      setScimSettings(data);
      setScimEnabled(data.scim_enabled);
      setScimAppId(data.scim_app_id || "");
      setScimScope(data.scim_scope || "");
      setScimClientId(data.scim_client_id || "");
    } catch {
      // Settings may not exist yet
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

  const handleDiscover = async () => {
    if (!tenantName.trim()) return;
    setIsDiscovering(true);
    setDiscoveryError(null);
    setDiscoveryRegion(null);
    try {
      const result = await discoverCyberArkTenant({
        subdomain: tenantName.trim(),
      });
      if (result.success) {
        setBaseUrl(result.base_url || "");
        setIdentityUrl(result.identity_url || "");
        setUapBaseUrl(result.uap_base_url || "");
        setDiscoveryRegion(result.region);
      } else {
        setDiscoveryError(result.message || "Discovery failed");
      }
    } catch {
      setDiscoveryError("Failed to connect to discovery service");
    } finally {
      setIsDiscovering(false);
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
        client_secret: clientSecret || undefined,
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
      tenant_name: tenantName || undefined,
      enabled,
      base_url: baseUrl || undefined,
      identity_url: identityUrl || undefined,
      uap_base_url: uapBaseUrl || undefined,
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

  const handleScimTest = async () => {
    if (!scimScope || !scimClientId) return;
    setIsScimTesting(true);
    setScimTestResult(null);
    try {
      const result = await testScimConnection({
        scim_app_id: scimAppId || undefined,
        scim_scope: scimScope,
        scim_client_id: scimClientId,
        scim_client_secret: scimClientSecret || undefined,
      });
      setScimTestResult(result);
    } catch {
      setScimTestResult({
        success: false,
        message: "Failed to test SCIM connection",
      });
    } finally {
      setIsScimTesting(false);
    }
  };

  const handleScimSave = async () => {
    setIsScimSaving(true);
    setScimSaveError(null);
    setScimSaveSuccess(false);

    const update: ScimSettingsUpdate = {
      scim_enabled: scimEnabled,
      scim_app_id: scimAppId || undefined,
      scim_scope: scimScope || undefined,
      scim_client_id: scimClientId || undefined,
    };

    if (scimClientSecret) {
      update.scim_client_secret = scimClientSecret;
    }

    try {
      const data = await updateScimSettings(update);
      setScimSettings(data);
      setScimSaveSuccess(true);
      setScimClientSecret("");
      setTimeout(() => setScimSaveSuccess(false), 3000);
      loadSyncStatus();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setScimSaveError(
        axiosError.response?.data?.detail || "Failed to save SCIM settings",
      );
    } finally {
      setIsScimSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const inputClasses =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white";

  const labelClasses =
    "block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <Shield className="mt-1 h-8 w-8 text-purple-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                CyberArk Integration
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Connect to CyberArk Privilege Cloud, Identity, and SIA
              </p>
            </div>
          </div>

          {/* Collapsible Sync Status */}
          {syncStatus && (
            <SyncStatusPanel
              status={syncStatus}
              isLoading={isSyncStatusLoading}
              onRefresh={loadSyncStatus}
            />
          )}
          {isSyncStatusLoading && !syncStatus && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sync status...
            </div>
          )}

          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                Enable CyberArk
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable resource sync and access mapping
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

          {/* ── Tenant & Platform API ── */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Tenant & Platform API
            </h4>

            {/* Tenant Name + Lookup */}
            <div>
              <label className={labelClasses}>Tenant Name</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="e.g. papaya"
                  className={`flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white`}
                />
                <button
                  onClick={handleDiscover}
                  disabled={!tenantName.trim() || isDiscovering}
                  className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {isDiscovering ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Lookup
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Auto-discovers Privilege Cloud and Identity URLs
              </p>
              {discoveryError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {discoveryError}
                </p>
              )}
              {discoveryRegion && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  Discovered (region: {discoveryRegion})
                </p>
              )}
            </div>

            {/* Resolved URLs */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClasses}>Privilege Cloud URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://tenant.privilegecloud.cyberark.cloud"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Identity URL</label>
                <input
                  type="url"
                  value={identityUrl}
                  onChange={(e) => setIdentityUrl(e.target.value)}
                  placeholder="https://abc1234.id.cyberark.cloud"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>SIA / UAP URL</label>
                <input
                  type="url"
                  value={uapBaseUrl}
                  onChange={(e) => setUapBaseUrl(e.target.value)}
                  placeholder="https://tenant.uap.cyberark.cloud/api"
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Platform credentials */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="service-account-client-id"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Client Secret</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={
                    settings?.has_client_secret
                      ? "••••••••"
                      : "Enter client secret"
                  }
                  className={inputClasses}
                />
                {settings?.has_client_secret && !clientSecret && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Secret saved. Leave blank to keep.
                  </p>
                )}
              </div>
            </div>

            {/* Platform test + save */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleTest}
                disabled={!baseUrl || !identityUrl || !clientId || isTesting}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {isTesting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </span>
                ) : (
                  "Test Platform"
                )}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Platform Settings"}
              </button>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {saveError}
                </p>
              )}
              {saveSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Saved
                </p>
              )}
            </div>

            <TestResultBanner result={testResult} />
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* ── SCIM Integration ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                SCIM Integration
              </h4>
              <button
                onClick={() => setScimEnabled(!scimEnabled)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  scimEnabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    scimEnabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Retrieve Identity users and roles via SCIM. Requires a separate
              OAuth2 app in CyberArk Identity.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>SCIM App ID</label>
                <input
                  type="text"
                  value={scimAppId}
                  onChange={(e) => setScimAppId(e.target.value)}
                  placeholder="e.g. labvisscim"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Builds OAuth2 URL:{" "}
                  <span className="font-mono">
                    {identityUrl || "<identity-url>"}/oauth2/token/
                    {scimAppId || "<app-id>"}
                  </span>
                </p>
              </div>
              <div>
                <label className={labelClasses}>Scope</label>
                <input
                  type="text"
                  value={scimScope}
                  onChange={(e) => setScimScope(e.target.value)}
                  placeholder="scim:read"
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClasses}>SCIM Client ID</label>
                <input
                  type="text"
                  value={scimClientId}
                  onChange={(e) => setScimClientId(e.target.value)}
                  placeholder="scim-app-client-id"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>SCIM Client Secret</label>
                <input
                  type="password"
                  value={scimClientSecret}
                  onChange={(e) => setScimClientSecret(e.target.value)}
                  placeholder={
                    scimSettings?.has_scim_client_secret
                      ? "••••••••"
                      : "Enter secret"
                  }
                  className={inputClasses}
                />
                {scimSettings?.has_scim_client_secret && !scimClientSecret && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Secret saved. Leave blank to keep.
                  </p>
                )}
              </div>
            </div>

            {/* SCIM test + save */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleScimTest}
                disabled={!scimScope || !scimClientId || isScimTesting}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {isScimTesting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Testing...
                  </span>
                ) : (
                  "Test SCIM"
                )}
              </button>
              <button
                onClick={handleScimSave}
                disabled={isScimSaving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isScimSaving ? "Saving..." : "Save SCIM Settings"}
              </button>
              {scimSaveError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {scimSaveError}
                </p>
              )}
              {scimSaveSuccess && (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Saved
                </p>
              )}
            </div>

            <TestResultBanner result={scimTestResult} />
          </div>

          {/* Last updated */}
          {settings?.updated_at && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
              {settings.updated_by && ` by ${settings.updated_by}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
