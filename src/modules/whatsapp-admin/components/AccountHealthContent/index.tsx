'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

interface AccountHealthData {
  phoneQuality: {
    score: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    lastUpdated: string | null;
    displayPhoneNumber: string;
  };
  recentAlerts: Array<{
    id: string;
    timestamp: string;
    severity: string;
    type: string;
    description: string;
    status: string;
  }>;
  templates: {
    approved: number;
    pending: number;
    rejected: number;
    paused: number;
  };
  messaging: {
    last24Hours: number;
    last7Days: number;
    blockRate: number;
  };
}

/**
 * Account Health Dashboard
 * Displays WhatsApp Business Account health metrics:
 * - Phone number quality score
 * - Account alerts
 * - Template status
 * - Messaging statistics
 */
export default function AccountHealthContent() {
  const router = useRouter();
  const { logout } = useWhatsAppAdminContext();
  const [healthData, setHealthData] = useState<AccountHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccountHealth();
  }, []);

  async function fetchAccountHealth() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/whatsapp-admin/account-health', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account health');
      }

      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      console.error('Error fetching account health:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function getQualityColor(score: string): string {
    switch (score) {
      case 'GREEN':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'RED':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/whatsapp-admin/dashboard')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Account Health</h1>
                <p className="text-xs text-gray-600 hidden sm:block">WhatsApp Business API Status</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={fetchAccountHealth}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors flex items-center space-x-1"
                disabled={loading}
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading account health</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {healthData && !loading && (
          <div className="space-y-6">
            {/* Phone Quality Status - Hero Section */}
            <div className={`border-2 rounded-xl p-6 ${getQualityColor(healthData.phoneQuality.score)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    {healthData.phoneQuality.score === 'GREEN' && (
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {healthData.phoneQuality.score === 'YELLOW' && (
                      <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    {healthData.phoneQuality.score === 'RED' && (
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <h2 className="text-2xl font-bold">Phone Quality: {healthData.phoneQuality.score}</h2>
                  </div>
                  <p className="text-sm font-medium">{healthData.phoneQuality.displayPhoneNumber}</p>
                  {healthData.phoneQuality.lastUpdated && (
                    <p className="text-xs mt-1 opacity-75">Last updated: {formatDate(healthData.phoneQuality.lastUpdated)}</p>
                  )}
                </div>
                <div className="text-right">
                  {healthData.phoneQuality.score === 'GREEN' && (
                    <span className="text-sm font-medium">✓ Excellent Health</span>
                  )}
                  {healthData.phoneQuality.score === 'YELLOW' && (
                    <span className="text-sm font-medium">⚠️ Needs Attention</span>
                  )}
                  {healthData.phoneQuality.score === 'RED' && (
                    <span className="text-sm font-medium">🚨 Critical Status</span>
                  )}
                </div>
              </div>

              {healthData.phoneQuality.score !== 'GREEN' && healthData.phoneQuality.score !== 'UNKNOWN' && (
                <div className="mt-4 pt-4 border-t border-current/20">
                  <h4 className="font-semibold mb-2">Recommended Actions:</h4>
                  <ul className="space-y-1 text-sm">
                    {healthData.phoneQuality.score === 'YELLOW' && (
                      <>
                        <li>• Review recent campaigns for high block rates</li>
                        <li>• Ensure message content follows Meta policies</li>
                        <li>• Monitor template approval status</li>
                      </>
                    )}
                    {healthData.phoneQuality.score === 'RED' && (
                      <>
                        <li>• <strong>URGENT:</strong> Stop all campaigns immediately</li>
                        <li>• Review account alerts below for specific violations</li>
                        <li>• Contact Meta support if restrictions applied</li>
                        <li>• Do not send messages until quality improves</li>
                      </>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Message Volume */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Messages Sent</h3>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{healthData.messaging.last24Hours}</p>
                    <p className="text-xs text-gray-600">Last 24 hours</p>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xl font-semibold text-gray-700">{healthData.messaging.last7Days}</p>
                    <p className="text-xs text-gray-600">Last 7 days</p>
                  </div>
                </div>
              </div>

              {/* Block Rate */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Block Rate</h3>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">{healthData.messaging.blockRate.toFixed(2)}%</p>
                  <p className="text-xs text-gray-600 mt-2">
                    {healthData.messaging.blockRate < 2 && <span className="text-green-600">✓ Below threshold</span>}
                    {healthData.messaging.blockRate >= 2 && healthData.messaging.blockRate < 5 && <span className="text-yellow-600">⚠️ Monitor closely</span>}
                    {healthData.messaging.blockRate >= 5 && <span className="text-red-600">🚨 Above limit!</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Target: &lt; 2%</p>
                </div>
              </div>

              {/* Template Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase">Templates</h3>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="text-lg font-semibold text-green-600">{healthData.templates.approved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-lg font-semibold text-yellow-600">{healthData.templates.pending}</span>
                  </div>
                  {healthData.templates.rejected > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rejected</span>
                      <span className="text-lg font-semibold text-red-600">{healthData.templates.rejected}</span>
                    </div>
                  )}
                  {healthData.templates.paused > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Paused</span>
                      <span className="text-lg font-semibold text-orange-600">{healthData.templates.paused}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Account Alerts</h3>
              {healthData.recentAlerts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">No active alerts</p>
                  <p className="text-xs mt-1">Your account is in good standing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {healthData.recentAlerts.map((alert) => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getSeverityColor(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className="text-xs text-gray-500">{alert.type}</span>
                          </div>
                          <p className="text-sm text-gray-900 font-medium mb-1">{alert.description}</p>
                          <p className="text-xs text-gray-500">Status: {alert.status}</p>
                        </div>
                        <span className="text-xs text-gray-500 ml-4">{formatDate(alert.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Understanding Quality Scores</h3>
                  <div className="mt-2 text-xs text-blue-700 space-y-1">
                    <p><strong>GREEN:</strong> Excellent quality, no restrictions</p>
                    <p><strong>YELLOW:</strong> Quality declining, review your messages</p>
                    <p><strong>RED:</strong> Critical - messaging may be restricted</p>
                  </div>
                  <div className="mt-3">
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-800 hover:text-blue-900 underline"
                    >
                      Learn more about WhatsApp quality ratings →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
