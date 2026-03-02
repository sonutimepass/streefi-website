/**
 * Campaign Logs Panel - Phase UI-3: Observability
 * 
 * Displays last 50 campaign execution events for debugging:
 * - Timestamp
 * - Phone number
 * - Status (SENT/FAILED/PROCESSING)
 * - Meta response
 * - Error messages
 * 
 * Real-time updates via refresh button.
 */

'use client';

import { useState, useEffect } from 'react';

interface LogEvent {
  timestamp: string;
  phone: string;
  status: 'SENT' | 'FAILED' | 'PROCESSING';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  metaResponse?: string;
  attempts?: number;
}

interface Props {
  campaignId: string;
}

export default function LogsPanel({ campaignId }: Props) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load logs
  const loadLogs = async () => {
    console.log('📋 [Logs Panel] Loading logs for campaign:', campaignId);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/logs`);
      const data = await response.json();

      if (!response.ok) {
        console.error('❌ [Logs Panel] Failed to load logs:', data.error);
        throw new Error(data.error || 'Failed to load logs');
      }

      console.log(`✅ [Logs Panel] Loaded ${data.logs?.length || 0} log entries`);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('❌ [Logs Panel] Error loading logs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadLogs();
  }, [campaignId]);

  // Auto-refresh every 5 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, campaignId]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  // Format phone number
  const formatPhone = (phone: string) => {
    // Remove country code for display (keep last 10 digits)
    if (phone.length > 10) {
      return phone.slice(-10);
    }
    return phone;
  };

  // Status badge styling
  const getStatusBadge = (status: LogEvent['status']) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded';
    
    switch (status) {
      case 'SENT':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'FAILED':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'PROCESSING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          Execution Logs
          <span className="ml-2 text-xs text-gray-500">
            (Last 50 events)
          </span>
        </h3>

        <div className="flex items-center space-x-3">
          {/* Auto-refresh toggle */}
          <label className="flex items-center space-x-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span>Auto-refresh</span>
          </label>

          {/* Manual refresh button */}
          <button
            onClick={loadLogs}
            disabled={loading}
            className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message ID
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meta Response
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500">
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-500">
                    No logs yet. Start the campaign to see execution events.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={`${log.timestamp}-${log.phone}-${index}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-900">
                      {formatPhone(log.phone)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={getStatusBadge(log.status)}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-mono text-gray-600">
                      {log.messageId ? (
                        <span title={log.messageId}>
                          {log.messageId.substring(0, 12)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 max-w-xs truncate">
                      {log.errorCode || log.errorMessage ? (
                        <span 
                          title={log.errorMessage || log.errorCode}
                          className="text-red-600"
                        >
                          {log.errorCode || log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-xs truncate">
                      {log.metaResponse ? (
                        <span 
                          title={log.metaResponse}
                          className="font-mono"
                        >
                          {log.metaResponse.substring(0, 30)}...
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {logs.length > 0 && (
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing {logs.length} of last 50 events
              {autoRefresh && ' • Auto-refreshing every 5s'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
