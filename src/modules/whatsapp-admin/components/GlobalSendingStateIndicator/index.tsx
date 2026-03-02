/**
 * Global Sending State Indicator
 * 
 * Prominent status display showing whether WhatsApp sending is enabled or disabled.
 * Updates in real-time with kill switch status.
 */

'use client';

import { useState, useEffect } from 'react';

interface KillSwitchStatus {
  enabled: boolean;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
}

export default function GlobalSendingStateIndicator() {
  const [status, setStatus] = useState<KillSwitchStatus>({ enabled: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    
    // Poll every 10 seconds
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    console.log('🔄 [Global State Indicator] Polling kill switch status...');
    try {
      const response = await fetch('/api/whatsapp-admin/kill-switch');
      const data = await response.json();
      
      if (response.ok && data.killSwitch) {
        console.log(`🟢 [Global State Indicator] Status: ${data.killSwitch.enabled ? 'SENDING DISABLED' : 'SENDING ENABLED'}`);
        setStatus(data.killSwitch);
      }
    } catch (error) {
      console.error('❌ [Global State Indicator] Failed to load status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
        <span className="text-gray-600">Checking...</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        status.enabled
          ? 'bg-red-100 text-red-800 border-2 border-red-300 animate-pulse'
          : 'bg-green-100 text-green-800 border-2 border-green-300'
      }`}
      title={status.enabled && status.reason ? `Disabled: ${status.reason}` : undefined}
    >
      <span className="text-base">
        {status.enabled ? '🔴' : '🟢'}
      </span>
      <span className="hidden sm:inline">
        {status.enabled ? 'Sending DISABLED' : 'Sending Enabled'}
      </span>
      <span className="sm:hidden">
        {status.enabled ? 'OFF' : 'ON'}
      </span>
    </div>
  );
}
