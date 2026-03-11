'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface WebhookEvent {
  id: string;
  webhook_type: string;
  timestamp: number;
  created_at: string;
  payload: any;
  metadata: any;
  ttl: number;
}

interface WebhookStat {
  type: string;
  count: number;
}

export function WebhookDebugContent() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      setError(null);
      const url = `/api/whatsapp-admin/webhook-debug?type=${filterType}&limit=100`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setWebhooks(data.webhooks || []);
        setStats(data.stats || []);
      } else {
        setError(data.error || 'Failed to fetch webhooks');
      }
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      setError('Failed to load webhook data');
    } finally {
      setIsLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Auto-refresh every 10 seconds if enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchWebhooks, 10000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchWebhooks]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  const getWebhookIcon = (type: string) => {
    const icons: Record<string, string> = {
      messages: '📨',
      message_status: '📊',
      account_alerts: '⚠️',
      account_review_update: '🔍',
      phone_number_quality_update: '📱',
      message_template_status_update: '📋',
      calls: '📞',
      flows: '🔄',
      security: '🔒',
      user_preferences: '👤',
    };
    return icons[type] || '📦';
  };

  const getWebhookBadgeColor = (type: string) => {
    if (type.includes('alert') || type.includes('security')) return 'bg-red-100 text-red-800';
    if (type.includes('quality')) return 'bg-yellow-100 text-yellow-800';
    if (type.includes('template') || type.includes('status')) return 'bg-blue-100 text-blue-800';
    if (type.includes('message')) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const totalWebhooks = webhooks.length;
  const uniqueTypes = stats.length;
  const latestTimestamp = webhooks[0]?.timestamp || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header
 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/whatsapp-admin')}
                className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Webhook Debugger</h1>
              <p className="mt-1 text-sm text-gray-500">
                Real-time webhook events from Meta WhatsApp Business API
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? '🔄 Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </button>
              <button
                onClick={fetchWebhooks}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-sm font-medium opacity-90">Total Events</div>
              <div className="text-3xl font-bold mt-1">{totalWebhooks}</div>
              <div className="text-xs opacity-75 mt-1">Stored in DynamoDB</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="text-sm font-medium opacity-90">Webhook Types</div>
              <div className="text-3xl font-bold mt-1">{uniqueTypes}</div>
              <div className="text-xs opacity-75 mt-1">Different event types</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-sm font-medium opacity-90">Last Event</div>
              <div className="text-xl font-bold mt-1">
                {latestTimestamp ? getRelativeTime(latestTimestamp) : '-'}
              </div>
              <div className="text-xs opacity-75 mt-1">
                {latestTimestamp ? formatTimestamp(latestTimestamp) : 'No events yet'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filter by Type</h2>
            {filterType !== 'all' && (
              <button
                onClick={() => setFilterType('all')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Types ({totalWebhooks})
            </button>
            {stats.map((stat) => (
              <button
                key={stat.type}
                onClick={() => setFilterType(stat.type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filterType === stat.type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getWebhookIcon(stat.type)} {stat.type} ({stat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Webhooks List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Webhook Events</h2>
          </div>

          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-500">Loading webhooks...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchWebhooks}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">No webhook events found</p>
              <p className="text-gray-400 text-sm mt-2">
                Webhooks will appear here when Meta sends events to your endpoint
              </p>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-medium text-blue-900 mb-2">💡 To receive webhooks:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Go to Meta Developer Console</li>
                  <li>Configure webhook URL</li>
                  <li>Subscribe to webhook fields</li>
                  <li>Test using "Send test event" button</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getWebhookIcon(webhook.webhook_type)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${getWebhookBadgeColor(
                                webhook.webhook_type
                              )}`}
                            >
                              {webhook.webhook_type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(webhook.timestamp)}
                            </span>
                            <span className="text-xs text-gray-400">
                              ({getRelativeTime(webhook.timestamp)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ID: {webhook.id.split('#').slice(-1)[0]}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Payload */}
                      {expandedWebhook === webhook.id && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <div className="text-xs font-medium text-gray-700 mb-1">Payload:</div>
                            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                              {JSON.stringify(webhook.payload, null, 2)}
                            </pre>
                          </div>
                          {webhook.metadata && Object.keys(webhook.metadata).length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-700 mb-1">Metadata:</div>
                              <pre className="text-xs bg-gray-900 text-cyan-400 p-3 rounded overflow-x-auto">
                                {JSON.stringify(webhook.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setExpandedWebhook(expandedWebhook === webhook.id ? null : webhook.id)
                      }
                      className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {expandedWebhook === webhook.id ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Webhook Debugging</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• All webhooks are automatically stored to DynamoDB with 90-day TTL</li>
            <li>• CloudWatch logs contain detailed debugging information for each webhook</li>
            <li>• Use filters to focus on specific webhook types</li>
            <li>• Enable auto-refresh to monitor webhooks in real-time</li>
            <li>• Click "View" on any webhook to see the full payload</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
