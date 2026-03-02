/**
 * Emergency Kill Switch Component
 * 
 * Top-right emergency control to disable ALL WhatsApp sending.
 * Critical for compliance emergencies (Meta flags, violations, etc.)
 * 
 * Features:
 * - One-click toggle
 * - Highly visible status
 * - Confirmation dialog
 * - Reason input when enabling
 */

'use client';

import { useState, useEffect } from 'react';

interface KillSwitchStatus {
  enabled: boolean;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
  disabledBy?: string;
  disabledAt?: string;
}

export default function EmergencyKillSwitch() {
  const [status, setStatus] = useState<KillSwitchStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');

  // Load status on mount
  useEffect(() => {
    loadStatus();
    
    // Poll every 30 seconds to stay updated
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load kill switch status
  const loadStatus = async () => {
    console.log('🔄 [Kill Switch] Loading status...');
    try {
      const response = await fetch('/api/whatsapp-admin/kill-switch');
      const data = await response.json();
      console.log('📥 [Kill Switch] Status loaded:', data.killSwitch);
      
      if (response.ok && data.killSwitch) {
        setStatus(data.killSwitch);
      }
    } catch (error) {
      console.error('❌ [Kill Switch] Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle toggle click
  const handleToggleClick = () => {
    if (status.enabled) {
      // Disabling - no confirmation needed
      toggleKillSwitch('disable');
    } else {
      // Enabling - show modal for reason
      setShowModal(true);
      setReason('');
    }
  };

  // Toggle kill switch
  const toggleKillSwitch = async (action: 'enable' | 'disable') => {
    setToggling(true);

    try {
      const response = await fetch('/api/whatsapp-admin/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action,
          reason: action === 'enable' ? reason : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to toggle kill switch');
      }

      // Update status
      await loadStatus();
      setShowModal(false);
      setReason('');
    } catch (error) {
      console.error('Toggle error:', error);
      alert(error instanceof Error ? error.message : 'Failed to toggle kill switch');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <>
      {/* Kill Switch Button */}
      <button
        onClick={handleToggleClick}
        disabled={toggling}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md font-semibold text-sm transition-all ${
          status.enabled
            ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/50 animate-pulse'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={status.enabled ? 'All sending is DISABLED' : 'All sending is ENABLED'}
      >
        <span className="text-lg">🛑</span>
        <span className="hidden sm:inline">
          {status.enabled ? 'SENDING DISABLED' : 'Emergency Stop'}
        </span>
        <span className="sm:hidden">
          {status.enabled ? 'DISABLED' : 'Stop'}
        </span>
      </button>

      {/* Enable Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              {/* Header */}
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">🛑</span>
                <div>
                  <h3 className="text-lg font-bold text-red-600">
                    Emergency Kill Switch
                  </h3>
                  <p className="text-sm text-gray-600">
                    This will STOP all WhatsApp sending immediately
                  </p>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ⚠️ WARNING: System-Wide Stop
                </p>
                <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                  <li>All campaigns will stop sending</li>
                  <li>No messages will be sent until re-enabled</li>
                  <li>Use only for emergencies (Meta flags, violations, etc.)</li>
                </ul>
              </div>

              {/* Reason Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Required)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g., Meta flagged account, compliance issue, testing..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                  disabled={toggling}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={toggling}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => toggleKillSwitch('enable')}
                  disabled={toggling || !reason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {toggling ? '⏳ Stopping...' : '🛑 STOP ALL SENDING'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Tooltip (when enabled) */}
      {status.enabled && status.reason && (
        <div className="absolute top-full right-0 mt-2 w-64 sm:w-80 bg-red-600 text-white rounded-lg shadow-lg p-3 z-50">
          <p className="text-xs font-bold mb-1">⚠️ All sending is STOPPED</p>
          <p className="text-xs mb-2">Reason: {status.reason}</p>
          {status.enabledBy && (
            <p className="text-xs opacity-75">
              By: {status.enabledBy} • {status.enabledAt ? new Date(status.enabledAt).toLocaleString() : ''}
            </p>
          )}
          <button
            onClick={() => toggleKillSwitch('disable')}
            disabled={toggling}
            className="mt-2 w-full px-3 py-1.5 bg-white text-red-600 rounded text-xs font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {toggling ? 'Re-enabling...' : 'Re-enable Sending'}
          </button>
        </div>
      )}
    </>
  );
}
