/**
 * Campaign Executor Section - Phase 1A
 * 
 * Manual campaign execution UI with:
 * - Campaign status display
 * - Start/Pause/Resume controls
 * - Manual batch executor button
 * - Real-time metrics
 * 
 * Future: Add cron/queue triggers
 */

'use client';

import { useState, useEffect } from 'react';

interface CampaignDetails {
  id: string;
  name: string;
  templateName: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progressPercentage: number;
  pausedReason?: string;
}

interface BatchResult {
  processed: number;
  sent: number;
  failed: number;
  paused: boolean;
  completed: boolean;
  pauseReason?: string;
}

export default function CampaignSection() {
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastBatchResult, setLastBatchResult] = useState<BatchResult | null>(null);

  // Load campaign details
  const loadCampaign = async (id: string) => {
    if (!id) {
      setCampaign(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load campaign');
      }

      setCampaign(data.campaign);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  // Control campaign (start/pause/resume)
  const controlCampaign = async (action: 'start' | 'pause' | 'resume') => {
    if (!campaignId) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} campaign`);
      }

      setSuccess(`Campaign ${action} successful`);
      
      // Reload campaign details
      await loadCampaign(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Execute batch
  const executeBatch = async () => {
    if (!campaignId) return;

    setExecuting(true);
    setError(null);
    setSuccess(null);
    setLastBatchResult(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/execute-batch`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Batch execution failed');
      }

      setLastBatchResult(data.result);
      
      if (data.result.completed) {
        setSuccess('✅ Campaign completed! No pending recipients.');
      } else if (data.result.paused) {
        setSuccess(`⚠️ Campaign paused: ${data.result.pauseReason}`);
      } else {
        setSuccess(`✅ Batch executed: ${data.result.sent} sent, ${data.result.failed} failed`);
      }

      // Reload campaign details
      await loadCampaign(campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">
        Campaign Executor (Phase 1A)
      </h2>

      {/* Campaign ID Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="cmp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => loadCampaign(campaignId)}
            disabled={loading || !campaignId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Campaign Details */}
      {campaign ? (
        <div className="space-y-4">
          {/* Status Banner */}
          <div className={`rounded-lg p-4 ${
            campaign.status === 'RUNNING' ? 'bg-green-50 border border-green-200' :
            campaign.status === 'PAUSED' ? 'bg-yellow-50 border border-yellow-200' :
            campaign.status === 'COMPLETED' ? 'bg-blue-50 border border-blue-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                <p className="text-sm text-gray-600">Template: {campaign.templateName}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                campaign.status === 'RUNNING' ? 'bg-green-100 text-green-800' :
                campaign.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800' :
                campaign.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {campaign.status}
              </div>
            </div>
            {campaign.pausedReason && (
              <p className="mt-2 text-sm text-yellow-700">
                ⚠️ Paused: {campaign.pausedReason}
              </p>
            )}
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Total</p>
              <p className="text-xl font-bold text-gray-900">{campaign.totalRecipients}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600">Sent</p>
              <p className="text-xl font-bold text-green-700">{campaign.sentCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-red-600">Failed</p>
              <p className="text-xl font-bold text-red-700">{campaign.failedCount}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600">Pending</p>
              <p className="text-xl font-bold text-blue-700">{campaign.pendingCount}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-medium text-gray-900">{campaign.progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${campaign.progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Last Batch Result */}
          {lastBatchResult && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Last Batch Result</h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-purple-600">Processed</p>
                  <p className="font-bold text-purple-900">{lastBatchResult.processed}</p>
                </div>
                <div>
                  <p className="text-purple-600">Sent</p>
                  <p className="font-bold text-purple-900">{lastBatchResult.sent}</p>
                </div>
                <div>
                  <p className="text-purple-600">Failed</p>
                  <p className="font-bold text-purple-900">{lastBatchResult.failed}</p>
                </div>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* Start Button */}
            {campaign.status === 'DRAFT' && (
              <button
                onClick={() => controlCampaign('start')}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶️ Start Campaign
              </button>
            )}

            {/* Pause Button */}
            {campaign.status === 'RUNNING' && (
              <button
                onClick={() => controlCampaign('pause')}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⏸️ Pause Campaign
              </button>
            )}

            {/* Resume Button */}
            {campaign.status === 'PAUSED' && (
              <button
                onClick={() => controlCampaign('resume')}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ▶️ Resume Campaign
              </button>
            )}

            {/* Execute Batch Button - Only when RUNNING */}
            {campaign.status === 'RUNNING' && campaign.pendingCount > 0 && (
              <button
                onClick={executeBatch}
                disabled={executing || loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {executing ? '⏳ Executing...' : '🚀 Execute Batch (25)'}
              </button>
            )}

            {/* Reload Button */}
            <button
              onClick={() => loadCampaign(campaignId)}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Reload
            </button>
          </div>

          {/* Helper Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-700">
              <strong>💡 Phase 1A - Manual Execution</strong><br />
              • Click "Execute Batch" to process 25 recipients<br />
              • Campaign auto-pauses when daily limit reached<br />
              • Campaign auto-completes when no pending recipients<br />
              • Safe to run repeatedly (idempotent & crash-safe)
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <p className="text-gray-600">Enter a campaign ID above to load campaign details</p>
          <p className="text-sm text-gray-500 mt-2">
            Use the campaign ID from the create endpoint (e.g., cmp_xxxxx...)
          </p>
        </div>
      )}
    </div>
  );
}

