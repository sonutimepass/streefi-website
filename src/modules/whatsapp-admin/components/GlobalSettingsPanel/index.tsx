/**
 * Global Settings Panel Component
 * 
 * System-wide WhatsApp configuration:
 * - Rate limits (messages per second)
 * - Default daily caps
 * - Meta tier limits
 * - Safety buffer settings
 * 
 * Admin-only controls for production safety.
 */

'use client';

import { useState, useEffect } from 'react';
import { getCsrfHeader } from '@/lib/csrfClient';

interface SystemSettings {
  maxMessagesPerSecond: number;
  defaultDailyCap: number;
  metaTierLimit: number;
  safetyBuffer: number;
  defaultSendDelay: number;
  dryRunMode: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

interface MetaConfig {
  phoneNumberId: string;
  businessAccountId: string;
}

export default function GlobalSettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [loadingKillSwitch, setLoadingKillSwitch] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileStatus, setReconcileStatus] = useState<{
    count: number;
    lastCheck: string | null;
  }>({ count: 0, lastCheck: null });

  // Meta configuration (fetched from server - never exposed via NEXT_PUBLIC_)
  const [metaConfig, setMetaConfig] = useState<MetaConfig>({
    phoneNumberId: 'Loading...',
    businessAccountId: 'Loading...'
  });

  // Form state
  const [formData, setFormData] = useState<SystemSettings>({
    maxMessagesPerSecond: 20,
    defaultDailyCap: 200,
    metaTierLimit: 250,
    safetyBuffer: 80,
    defaultSendDelay: 50,
    dryRunMode: false
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadKillSwitchStatus();
    checkReconcileStatus();
  }, []);

  // Load settings
  const loadSettings = async () => {
    console.log('⚙️ [Settings Panel] Loading settings...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp-admin/settings');
      const data = await response.json();
      console.log('📥 [Settings Panel] Settings loaded:', data.settings);

      if (!response.ok) {
        console.error('❌ [Settings Panel] Failed to load settings:', data.error);
        throw new Error(data.error || 'Failed to load settings');
      }

      console.log('✅ [Settings Panel] Settings loaded successfully');
      setSettings(data.settings);
      setFormData(data.settings);
      
      // Set Meta configuration (fetched server-side for security)
      if (data.metaConfig) {
        setMetaConfig(data.metaConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load kill switch status
  const loadKillSwitchStatus = async () => {
    setLoadingKillSwitch(true);
    try {
      const response = await fetch('/api/whatsapp-admin/kill-switch');
      const data = await response.json();
      setKillSwitchEnabled(data.enabled || false);
    } catch (err) {
      console.error('Failed to load kill switch status:', err);
    } finally {
      setLoadingKillSwitch(false);
    }
  };

  // Check reconcile status (dry-run)
  const checkReconcileStatus = async () => {
    try {
      const response = await fetch('/api/campaigns/reconcile');
      const data = await response.json();
      setReconcileStatus({
        count: data.count || 0,
        lastCheck: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to check reconcile status:', err);
    }
  };

  // Run reconciliation
  const runReconciliation = async () => {
    setReconciling(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/campaigns/reconcile', {
        method: 'POST',
        headers: { ...getCsrfHeader() },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reconciliation failed');
      }

      setSuccess(`✅ Recovered ${data.recovered} stuck recipients (scanned ${data.scanned})`);
      setReconcileStatus({
        count: 0,
        lastCheck: new Date().toISOString()
      });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    console.log('💾 [Settings Panel] Saving settings:', formData);
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/whatsapp-admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log('📥 [Settings Panel] Save response:', data);

      if (!response.ok) {
        console.error('❌ [Settings Panel] Failed to save settings:', data.error);
        throw new Error(data.error || 'Failed to save settings');
      }

      console.log('✅ [Settings Panel] Settings saved successfully');
      setSettings(data.settings);
      setFormData(data.settings);
      setSuccess('Settings saved successfully');
      setEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const cancelEdit = () => {
    if (settings) {
      setFormData(settings);
    }
    setEditing(false);
    setError(null);
  };

  // Calculate effective daily cap
  const effectiveDailyCap = Math.floor(
    (formData.metaTierLimit * formData.safetyBuffer) / 100
  );

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Global Settings
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            System-wide WhatsApp rate limits and safety controls
          </p>
        </div>
        
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Settings
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* Rate Limit */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🚦 Max Messages Per Second
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Global rate limit for all WhatsApp sending. Meta allows ~20 msg/sec.
          </p>
          {editing ? (
            <input
              type="number"
              min="1"
              max="50"
              value={formData.maxMessagesPerSecond}
              onChange={(e) => setFormData({ ...formData, maxMessagesPerSecond: parseInt(e.target.value) || 20 })}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-blue-600">{settings?.maxMessagesPerSecond}</span>
              <span className="text-sm text-gray-600">messages/second</span>
            </div>
          )}
        </div>

        {/* Meta Tier Limit */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            📊 Meta Tier Limit
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Your Meta business account tier limit (business-initiated conversations per 24h).
          </p>
          {editing ? (
            <input
              type="number"
              min="50"
              max="100000"
              step="50"
              value={formData.metaTierLimit}
              onChange={(e) => setFormData({ ...formData, metaTierLimit: parseInt(e.target.value) || 250 })}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-purple-600">{settings?.metaTierLimit}</span>
              <span className="text-sm text-gray-600">messages/day</span>
            </div>
          )}
        </div>

        {/* Safety Buffer */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🛡️ Safety Buffer
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Percentage of tier limit to use (e.g., 80% = use only 80% of Meta limit for safety).
          </p>
          {editing ? (
            <div className="space-y-2">
              <input
                type="range"
                min="50"
                max="100"
                value={formData.safetyBuffer}
                onChange={(e) => setFormData({ ...formData, safetyBuffer: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-600">
                <span>50%</span>
                <span className="font-bold text-gray-900">{formData.safetyBuffer}%</span>
                <span>100%</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-green-600">{settings?.safetyBuffer}%</span>
              <span className="text-sm text-gray-600">of tier limit</span>
            </div>
          )}
        </div>

        {/* Default Daily Cap (Calculated) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="block text-sm font-semibold text-blue-900 mb-2">
            📅 Effective Daily Cap
          </label>
          <p className="text-xs text-blue-700 mb-3">
            Calculated: {editing ? formData.metaTierLimit : settings?.metaTierLimit} × {editing ? formData.safetyBuffer : settings?.safetyBuffer}% = <strong>{effectiveDailyCap}</strong> messages/day
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-3xl font-bold text-blue-700">{effectiveDailyCap}</span>
            <span className="text-sm text-blue-700">messages/day (safe limit)</span>
          </div>
        </div>

        {/* Default Campaign Cap */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🎯 Default Campaign Cap
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Default daily cap for new campaigns. Can be overridden per campaign.
          </p>
          {editing ? (
            <input
              type="number"
              min="1"
              max={effectiveDailyCap}
              value={formData.defaultDailyCap}
              onChange={(e) => setFormData({ ...formData, defaultDailyCap: parseInt(e.target.value) || effectiveDailyCap })}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-orange-600">{settings?.defaultDailyCap}</span>
              <span className="text-sm text-gray-600">messages/day</span>
            </div>
          )}
        </div>

        {/* Default Send Delay */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            ⏱️ Default Send Delay
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Delay between messages in milliseconds (default: 50ms = 20 msg/sec).
          </p>
          {editing ? (
            <input
              type="number"
              min="10"
              max="1000"
              step="10"
              value={formData.defaultSendDelay}
              onChange={(e) => setFormData({ ...formData, defaultSendDelay: parseInt(e.target.value) || 50 })}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-indigo-600">{settings?.defaultSendDelay}</span>
              <span className="text-sm text-gray-600">milliseconds</span>
            </div>
          )}
        </div>

        {/* Dry Run Mode */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🧪 Dry Run Mode
          </label>
          <p className="text-xs text-gray-600 mb-3">
            When enabled, campaigns will run without actually sending messages (testing only).
          </p>
          {editing ? (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.dryRunMode}
                onChange={(e) => setFormData({ ...formData, dryRunMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              <span className="ml-3 text-sm font-medium text-gray-900">
                {formData.dryRunMode ? 'Enabled (Test Mode)' : 'Disabled (Production)'}
              </span>
            </label>
          ) : (
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                settings?.dryRunMode 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {settings?.dryRunMode ? '🧪 Test Mode' : '✅ Production'}
              </span>
            </div>
          )}
        </div>

        {/* Kill Switch Status (Read-only) */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🚨 Emergency Kill Switch
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Global kill switch to stop all campaign sending immediately.
          </p>
          {loadingKillSwitch ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${
                killSwitchEnabled 
                  ? 'bg-red-100 text-red-800 animate-pulse' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {killSwitchEnabled ? '🔴 SENDING DISABLED' : '🟢 Sending Enabled'}
              </span>
              <button
                onClick={loadKillSwitchStatus}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                🔄 Refresh
              </button>
            </div>
          )}
        </div>

        {/* Reconciliation Status & Control */}
        <div className="border-b border-gray-200 pb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            🔧 Recipient Reconciliation
          </label>
          <p className="text-xs text-gray-600 mb-3">
            Detect and recover recipients stuck in PROCESSING status (DB write failures).
          </p>
          
          <div className="space-y-3">
            {/* Status Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-700">Stuck Recipients</p>
                  <p className={`text-2xl font-bold ${
                    reconcileStatus.count > 0 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {reconcileStatus.count}
                  </p>
                </div>
                <button
                  onClick={checkReconcileStatus}
                  disabled={reconciling}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  🔄 Check
                </button>
              </div>
              {reconcileStatus.lastCheck && (
                <p className="text-xs text-gray-500 mt-2">
                  Last checked: {new Date(reconcileStatus.lastCheck).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={runReconciliation}
              disabled={reconciling || reconcileStatus.count === 0}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reconciling ? '⏳ Recovering...' : `🔧 Recover Stuck Recipients${reconcileStatus.count > 0 ? ` (${reconcileStatus.count})` : ''}`}
            </button>

            <p className="text-xs text-gray-500">
              💡 Auto-runs before each batch execution. Manual recovery useful for testing.
            </p>
          </div>
        </div>

        {/* Meta Configuration (Read-only) */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Meta WhatsApp Configuration</h3>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Phone Number ID
            </label>
            <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
              {metaConfig.phoneNumberId}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              WhatsApp Business Account ID
            </label>
            <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
              {metaConfig.businessAccountId}
            </p>
          </div>

          <p className="text-xs text-gray-500 italic">
            These values are configured via environment variables and cannot be changed here.
          </p>
        </div>
      </div>

      {/* Action Buttons (when editing) */}
      {editing && (
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={cancelEdit}
            disabled={saving}
            className="flex-1 sm:flex-none px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>
      )}

      {/* Last Updated Info */}
      {settings?.updatedBy && settings?.updatedAt && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Last updated by <strong>{settings.updatedBy}</strong> on{' '}
            {new Date(settings.updatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
