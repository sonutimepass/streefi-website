/**
 * Campaign Detail Modal Component
 * 
 * Full campaign control center with:
 * - Campaign metadata & metrics
 * - Real-time progress tracking
 * - Control actions (Start/Pause/Resume/Stop)
 * - Batch execution
 * - Delete campaign
 */

'use client';

import { useState } from 'react';
import { CampaignListItem } from '../CampaignListTable';
import LogsPanel from '../LogsPanel';

interface BatchResult {
  processed: number;
  sent: number;
  failed: number;
  paused: boolean;
  completed: boolean;
  pauseReason?: string;
}

interface Props {
  campaign: CampaignListItem;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function CampaignDetailModal({ 
  campaign: initialCampaign, 
  isOpen, 
  onClose,
  onRefresh 
}: Props) {
  const [campaign, setCampaign] = useState<CampaignListItem>(initialCampaign);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastBatchResult, setLastBatchResult] = useState<BatchResult | null>(null);

  if (!isOpen) return null;

  // Reload campaign data
  const reloadCampaign = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reload campaign');
      }

      setCampaign({
        ...campaign,
        ...data.campaign
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Control campaign (start/pause/resume/stop)
  const controlCampaign = async (action: 'start' | 'pause' | 'resume' | 'stop') => {
    console.log(`🎛️ [Campaign Detail] Control action: ${action} for campaign ${campaign.id}`);
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      console.log(`📥 [Campaign Detail] Control response:`, data);

      if (!response.ok) {
        console.error(`❌ [Campaign Detail] Control failed:`, data.error);
        throw new Error(data.error || `Failed to ${action} campaign`);
      }

      console.log(`✅ [Campaign Detail] Control action ${action} successful`);
      setSuccess(`Campaign ${action} successful`);
      
      // Reload campaign details
      await reloadCampaign();
      onRefresh(); // Refresh parent list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Execute batch
  const executeBatch = async () => {
    console.log(`⚡ [Campaign Detail] Executing batch for campaign ${campaign.id}`);
    setExecuting(true);
    setError(null);
    setSuccess(null);
    setLastBatchResult(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/execute-batch`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log(`📥 [Campaign Detail] Batch execution response:`, data);

      if (!response.ok) {
        console.error(`❌ [Campaign Detail] Batch execution failed:`, data.error);
        throw new Error(data.error || 'Batch execution failed');
      }

      console.log(`✅ [Campaign Detail] Batch executed - Result:`, data.result);
      setLastBatchResult(data.result);
      
      if (data.result.completed) {
        setSuccess('✅ Campaign completed! No pending recipients.');
      } else if (data.result.paused) {
        setSuccess(`⚠️ Campaign paused: ${data.result.pauseReason}`);
      } else {
        setSuccess(`✅ Batch executed: ${data.result.sent} sent, ${data.result.failed} failed`);
      }

      // Reload campaign details
      await reloadCampaign();
      onRefresh(); // Refresh parent list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setExecuting(false);
    }
  };

  // Delete campaign
  const deleteCampaign = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${campaign.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete campaign');
      }

      setSuccess('Campaign deleted successfully');
      
      // Close modal and refresh list after short delay
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Retry failed recipients
  const retryFailed = async () => {
    console.log(`🔄 [Campaign Detail] Retrying failed recipients for campaign ${campaign.id}`);
    if (campaign.failedCount === 0) {
      console.log('⚠️ [Campaign Detail] No failed recipients to retry');
      setError('No failed recipients to retry');
      return;
    }

    const confirmed = window.confirm(
      `Retry ${campaign.failedCount} failed recipient(s)?\n\nThis will reset their status to PENDING and retry sending.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/retry-failed`, {
        method: 'POST'
      });

      const data = await response.json();
      console.log(`📥 [Campaign Detail] Retry failed response:`, data);

      if (!response.ok) {
        console.error(`❌ [Campaign Detail] Retry failed:`, data.error);
        throw new Error(data.error || 'Failed to retry');
      }

      console.log(`✅ [Campaign Detail] Retry successful - ${data.retriedCount} recipients reset`);
      setSuccess(`✅ ${data.retriedCount} failed recipients reset to PENDING. You can now execute batches.`);
      
      // Reload campaign details
      await reloadCampaign();
      onRefresh(); // Refresh parent list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatDateTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color
  const getStatusColor = (status: CampaignListItem['status']) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'READY':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DRAFT':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {campaign.name}
              </h2>
              <p className="text-sm text-gray-500 font-mono mt-1">
                {campaign.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            )}

            {/* Top Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status & Template */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Template</label>
                  <p className="text-sm font-medium text-gray-900">{campaign.templateName}</p>
                </div>
              </div>

              {/* Timestamps & Daily Cap */}
              <div className="space-y-3">
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
            </div>

            {/* Pause Reason */}
            {campaign.pausedReason && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Paused Reason:</strong> {campaign.pausedReason}
                </p>
              </div>
            )}

            {/* Metrics */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Metrics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600 mb-1">Total Recipients</p>
                  <p className="text-2xl font-bold text-gray-900">{campaign.totalRecipients}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-green-600 mb-1">Sent</p>
                  <p className="text-2xl font-bold text-green-700">{campaign.sentCount}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-red-600 mb-1">Failed</p>
                  <p className="text-2xl font-bold text-red-700">{campaign.failedCount}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">Pending</p>
                  <p className="text-2xl font-bold text-blue-700">{campaign.pendingCount}</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm font-bold text-gray-900">{campaign.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center text-xs font-medium text-white"
                  style={{ width: `${campaign.progressPercentage}%` }}
                >
                  {campaign.progressPercentage > 10 && `${campaign.progressPercentage}%`}
                </div>
              </div>
            </div>

            {/* Last Batch Result */}
            {lastBatchResult && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-900 mb-3">Last Batch Result</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-xs text-purple-600 mb-1">Processed</p>
                    <p className="text-xl font-bold text-purple-900">{lastBatchResult.processed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-purple-600 mb-1">Sent</p>
                    <p className="text-xl font-bold text-purple-900">{lastBatchResult.sent}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-purple-600 mb-1">Failed</p>
                    <p className="text-xl font-bold text-purple-900">{lastBatchResult.failed}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Controls</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Start Button */}
                {(campaign.status === 'DRAFT' || campaign.status === 'READY') && (
                  <button
                    onClick={() => controlCampaign('start')}
                    disabled={loading}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ▶️ Start
                  </button>
                )}

                {/* Pause Button */}
                {campaign.status === 'RUNNING' && (
                  <button
                    onClick={() => controlCampaign('pause')}
                    disabled={loading}
                    className="px-4 py-2.5 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏸️ Pause
                  </button>
                )}

                {/* Resume Button */}
                {campaign.status === 'PAUSED' && (
                  <button
                    onClick={() => controlCampaign('resume')}
                    disabled={loading}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ▶️ Resume
                  </button>
                )}

                {/* Execute Batch Button */}
                {campaign.status === 'RUNNING' && campaign.pendingCount > 0 && (
                  <button
                    onClick={executeBatch}
                    disabled={executing || loading}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {executing ? '⏳ Executing...' : '🚀 Execute Batch'}
                  </button>
                )}

                {/* Retry Failed Button */}
                {campaign.failedCount > 0 && campaign.status !== 'COMPLETED' && (
                  <button
                    onClick={retryFailed}
                    disabled={loading}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🔄 Retry Failed ({campaign.failedCount})
                  </button>
                )}

                {/* Reload Button */}
                <button
                  onClick={reloadCampaign}
                  disabled={loading}
                  className="px-4 py-2.5 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  🔄 Reload
                </button>

                {/* Stop Button */}
                {(campaign.status === 'RUNNING' || campaign.status === 'PAUSED') && (
                  <button
                    onClick={() => controlCampaign('stop')}
                    disabled={loading}
                    className="px-4 py-2.5 bg-orange-600 text-white rounded-md font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏹️ Stop
                  </button>
                )}

                {/* Delete Button */}
                {(campaign.status === 'DRAFT' || campaign.status === 'COMPLETED') && (
                  <button
                    onClick={deleteCampaign}
                    disabled={loading}
                    className="px-4 py-2.5 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>

            {/* Logs Panel - Phase UI-3: Observability */}
            <LogsPanel campaignId={campaign.id} />

            {/* Helper Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>💡 Phase 1A - Manual Execution</strong><br />
                • Click "Execute Batch" to process 25 recipients at a time<br />
                • Campaign auto-pauses when daily limit is reached<br />
                • Campaign auto-completes when no pending recipients remain<br />
                • Safe to run repeatedly (idempotent & crash-safe)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
