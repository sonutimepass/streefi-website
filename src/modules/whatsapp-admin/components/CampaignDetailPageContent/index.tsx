'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import EmergencyKillSwitch from '../EmergencyKillSwitch';
import GlobalSendingStateIndicator from '../GlobalSendingStateIndicator';

interface CampaignDetail {
  id: string;
  name: string;
  templateName: string;
  status: 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progressPercentage: number;
  dailyCap?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedReason?: string;
}

interface Log {
  phone: string;
  timestamp: number;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
}

/**
 * Campaign Detail Page
 * 
 * Full-page replacement for CampaignDetailModal
 * Shows complete campaign details, control buttons, and logs
 */
export default function CampaignDetailPageContent({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const { logout } = useWhatsAppAdminContext();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch campaign details
      const campaignRes = await fetch(`/api/campaigns/${campaignId}`);
      if (!campaignRes.ok) throw new Error('Failed to fetch campaign');
      const campaignData = await campaignRes.json();
      setCampaign(campaignData.campaign);

      // Fetch logs
      const logsRes = await fetch(`/api/campaigns/${campaignId}/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData.logs || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleControl = async (action: 'start' | 'pause' | 'resume') => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (!res.ok) throw new Error(`Failed to ${action} campaign`);
      
      await fetchCampaignDetails(); // Refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Control action failed');
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Campaign not found'}</p>
          <button
            onClick={() => router.push('/whatsapp-admin/campaigns')}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Kill Switch */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/whatsapp-admin/campaigns')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Back to campaigns"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{campaign.name}</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Campaign Details</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <GlobalSendingStateIndicator />
              <EmergencyKillSwitch />
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
        {/* Campaign Info Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Campaign ID</label>
              <p className="text-sm font-mono text-gray-900">{campaign.id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                campaign.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                campaign.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                campaign.status === 'READY' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {campaign.status}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
              <p className="text-sm font-medium text-gray-900">{campaign.templateName}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-semibold text-gray-900">{campaign.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${campaign.progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{campaign.totalRecipients}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-xs text-green-600 mb-1">Sent</p>
              <p className="text-2xl font-bold text-green-700">{campaign.sentCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-xs text-red-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-700">{campaign.failedCount}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-blue-700">{campaign.pendingCount}</p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Daily Cap</label>
              {campaign.dailyCap ? (
                <p className="text-sm font-medium text-gray-900">{campaign.dailyCap} messages/day</p>
              ) : (
                <p className="text-sm font-semibold text-red-600">⚠️ NOT SET (UNSAFE)</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Created At</label>
              <p className="text-sm text-gray-900">{formatDateTime(campaign.createdAt)}</p>
            </div>
            {campaign.startedAt && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Started At</label>
                <p className="text-sm text-gray-900">{formatDateTime(campaign.startedAt)}</p>
              </div>
            )}
            {campaign.completedAt && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Completed At</label>
                <p className="text-sm text-gray-900">{formatDateTime(campaign.completedAt)}</p>
              </div>
            )}
          </div>

          {/* Pause Reason */}
          {campaign.pausedReason && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Paused Reason:</strong> {campaign.pausedReason}
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
            {campaign.status === 'READY' && (
              <button
                onClick={() => handleControl('start')}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
              >
                ▶️ Start Campaign
              </button>
            )}
            {campaign.status === 'RUNNING' && (
              <button
                onClick={() => handleControl('pause')}
                className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 transition-colors"
              >
                ⏸️ Pause Campaign
              </button>
            )}
            {campaign.status === 'PAUSED' && (
              <button
                onClick={() => handleControl('resume')}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                ▶️ Resume Campaign
              </button>
            )}
            <button
              onClick={fetchCampaignDetails}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-md text-sm">
                  <div className="flex-1">
                    <span className="font-mono text-gray-700">{log.phone}</span>
                    {log.status === 'success' ? (
                      <span className="ml-3 text-green-600">✓ Sent</span>
                    ) : (
                      <span className="ml-3 text-red-600">✗ Failed</span>
                    )}
                    {log.error && <span className="ml-2 text-xs text-red-500">({log.error})</span>}
                  </div>
                  <span className="text-xs text-gray-500">{formatDateTime(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
