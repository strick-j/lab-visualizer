import { useState, useEffect } from 'react';
import { Shield, Key, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAuthSettings,
  updateOIDCSettings,
  updateSAMLSettings,
  testOIDCConnection,
} from '@/api/client';
import type {
  AuthSettingsResponse,
  OIDCSettingsUpdate,
  SAMLSettingsUpdate,
  TestConnectionResponse,
} from '@/types';

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AuthSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'oidc' | 'saml'>('oidc');

  // Check if user is admin
  const isAdmin = user?.is_admin ?? false;

  useEffect(() => {
    if (isAdmin) {
      loadSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getAuthSettings();
      setSettings(data);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Application settings and configuration</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <p className="text-yellow-800 dark:text-yellow-200">
              Admin privileges required to access settings.
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Application settings and configuration</p>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure authentication providers for single sign-on
        </p>
      </div>

      {/* Local Auth Status */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Local Authentication</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Username and password authentication
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              settings?.local_auth_enabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {settings?.local_auth_enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Local authentication is configured via environment variables (LOCAL_AUTH_ENABLED)
        </p>
      </div>

      {/* SSO Configuration Tabs */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('oidc')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'oidc'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              OIDC / OAuth 2.0
            </button>
            <button
              onClick={() => setActiveTab('saml')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'saml'
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              SAML 2.0
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'oidc' && settings && (
            <OIDCSettingsForm settings={settings.oidc} onUpdate={loadSettings} />
          )}
          {activeTab === 'saml' && settings && (
            <SAMLSettingsForm settings={settings.saml} onUpdate={loadSettings} />
          )}
        </div>
      </div>
    </div>
  );
}

interface OIDCSettingsFormProps {
  settings: AuthSettingsResponse['oidc'];
  onUpdate: () => void;
}

function OIDCSettingsForm({ settings, onUpdate }: OIDCSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [issuer, setIssuer] = useState(settings.issuer || '');
  const [clientId, setClientId] = useState(settings.client_id || '');
  const [clientSecret, setClientSecret] = useState('');
  const [displayName, setDisplayName] = useState(settings.display_name || 'OIDC');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleTest = async () => {
    if (!issuer) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testOIDCConnection(issuer);
      setTestResult(result);
    } catch (err) {
      setTestResult({ success: false, message: 'Failed to test connection' });
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
    };

    // Only include client secret if it was changed
    if (clientSecret) {
      update.client_secret = clientSecret;
    }

    try {
      await updateOIDCSettings(update);
      setSaveSuccess(true);
      setClientSecret(''); // Clear secret after save
      onUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError.response?.data?.detail || 'Failed to save settings');
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
            Configure OIDC authentication with providers like Okta, Azure AD, Google, or Auth0
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Enable OIDC</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Allow users to sign in with OIDC
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
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
              {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Test'}
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
                ? 'bg-green-50 dark:bg-green-900/20'
                : 'bg-red-50 dark:bg-red-900/20'
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
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
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
            placeholder={settings.client_secret_configured ? '********' : 'Enter client secret'}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {settings.client_secret_configured && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A client secret is already configured. Leave blank to keep the existing secret.
            </p>
          )}
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
      </div>

      {/* Save button and messages */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        {saveSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved successfully</p>
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

interface SAMLSettingsFormProps {
  settings: AuthSettingsResponse['saml'];
  onUpdate: () => void;
}

function SAMLSettingsForm({ settings, onUpdate }: SAMLSettingsFormProps) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [idpEntityId, setIdpEntityId] = useState(settings.idp_entity_id || '');
  const [idpSsoUrl, setIdpSsoUrl] = useState(settings.idp_sso_url || '');
  const [idpCertificate, setIdpCertificate] = useState('');
  const [spEntityId, setSpEntityId] = useState(settings.sp_entity_id || '');
  const [displayName, setDisplayName] = useState(settings.display_name || 'SAML');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const update: SAMLSettingsUpdate = {
      enabled,
      idp_entity_id: idpEntityId || undefined,
      idp_sso_url: idpSsoUrl || undefined,
      sp_entity_id: spEntityId || undefined,
      display_name: displayName || undefined,
    };

    // Only include certificate if it was changed
    if (idpCertificate) {
      update.idp_certificate = idpCertificate;
    }

    try {
      await updateSAMLSettings(update);
      setSaveSuccess(true);
      setIdpCertificate(''); // Clear certificate after save
      onUpdate();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setSaveError(axiosError.response?.data?.detail || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Shield className="mt-1 h-8 w-8 text-purple-500" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">SAML 2.0</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure SAML authentication with enterprise identity providers
          </p>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">Enable SAML</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Allow users to sign in with SAML
          </p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Configuration fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            IdP Entity ID
          </label>
          <input
            type="text"
            value={idpEntityId}
            onChange={(e) => setIdpEntityId(e.target.value)}
            placeholder="https://idp.example.com/saml"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Entity ID of your SAML Identity Provider
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            IdP SSO URL
          </label>
          <input
            type="url"
            value={idpSsoUrl}
            onChange={(e) => setIdpSsoUrl(e.target.value)}
            placeholder="https://idp.example.com/sso/saml"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Single Sign-On URL of your Identity Provider
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            IdP Certificate (PEM)
          </label>
          <textarea
            value={idpCertificate}
            onChange={(e) => setIdpCertificate(e.target.value)}
            placeholder={
              settings.idp_certificate_configured
                ? 'Certificate configured. Paste new certificate to replace.'
                : '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'
            }
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          {settings.idp_certificate_configured && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              A certificate is already configured. Leave blank to keep the existing certificate.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            SP Entity ID (Optional)
          </label>
          <input
            type="text"
            value={spEntityId}
            onChange={(e) => setSpEntityId(e.target.value)}
            placeholder="Leave blank to use application URL"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The Entity ID for this application (Service Provider)
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
            placeholder="Sign in with SSO"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Text shown on the login button
          </p>
        </div>
      </div>

      {/* Save button and messages */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}
        {saveSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved successfully</p>
        )}
      </div>

      {settings.updated_at && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Last updated: {new Date(settings.updated_at).toLocaleString()}
          {settings.updated_by && ` by ${settings.updated_by}`}
        </p>
      )}

      {/* Note about SAML implementation */}
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              SAML Configuration Note
            </p>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Full SAML support requires the python3-saml library. The current implementation
              provides basic configuration storage. Contact your administrator to complete the SAML
              setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
