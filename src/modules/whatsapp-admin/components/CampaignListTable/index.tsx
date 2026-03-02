/**
 * Campaign List Table Component
 * 
 * Production-ready campaign list with:
 * - Full campaign visibility
 * - Status badges
 * - Progress indicators
 * - Action controls
 * - Responsive design (desktop table + mobile cards)
 */

'use client';

import { useState } from 'react';

export interface CampaignListItem {
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

interface Props {
  campaigns: CampaignListItem[];
  loading: boolean;
  onViewDetails: (campaign: CampaignListItem) => void;
  onRefresh: () => void;
}

export default function CampaignListTable({ 
  campaigns, 
  loading, 
  onViewDetails,
  onRefresh 
}: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status: CampaignListItem['status']) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      case 'READY':
        return 'bg-purple-100 text-purple-800';
      case 'DRAFT':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle campaign actions
  const handleAction = async (campaignId: string, action: 'START' | 'PAUSE' | 'RESUME') => {
    console.log(`🎮 [Campaign List] Action requested: ${action} for campaign ${campaignId}`);
    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      console.log(`📥 [Campaign List] Action response:`, data);
      
      if (!response.ok) {
        console.error(`❌ [Campaign List] Action failed:`, data.error);
        throw new Error(data.error || 'Action failed');
      }

      console.log(`✅ [Campaign List] Action ${action} successful`);
      // Refresh list
      onRefresh();
    } catch (error) {
      console.error('Campaign action error:', error);
      alert(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle campaign deletion
  const handleDelete = async (campaignId: string, campaignName: string) => {
    console.log(`🗑️ [Campaign List] Delete requested for campaign ${campaignId}`);
    
    if (!confirm(`Are you sure you want to delete campaign "${campaignName}"?\n\nThis will permanently delete all campaign data, recipients, and logs. This action cannot be undone.`)) {
      console.log('⚠️ [Campaign List] Delete cancelled by user');
      return;
    }

    setActionLoading(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      console.log(`📥 [Campaign List] Delete response:`, data);
      
      if (!response.ok) {
        console.error(`❌ [Campaign List] Delete failed:`, data.error);
        throw new Error(data.error || 'Delete failed');
      }

      console.log(`✅ [Campaign List] Campaign deleted successfully`);
      // Refresh list
      onRefresh();
    } catch (error) {
      console.error('Campaign delete error:', error);
      alert(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <svg 
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        <p className="mt-4 text-gray-600 text-sm sm:text-base">No campaigns created yet.</p>
        <p className="mt-2 text-gray-500 text-xs sm:text-sm">
          Create a campaign using the <code className="px-1 py-0.5 bg-gray-200 rounded text-xs">POST /api/campaigns/create</code> endpoint.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} found
        </p>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Campaign
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Template
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Failed
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Run
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <tr 
                key={campaign.id}
                className="hover:bg-gray-50 transition-colors"
              >
                {/* Campaign Name */}
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {campaign.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {campaign.dailyCap ? `Cap: ${campaign.dailyCap}/day` : 'No cap'}
                  </div>
                </td>

                {/* Template */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {campaign.templateName}
                </td>

                {/* Status Badge */}
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </td>

                {/* Total Recipients */}
                <td className="px-4 py-3 text-center text-sm text-gray-900 font-medium">
                  {campaign.totalRecipients}
                </td>

                {/* Sent Count */}
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-medium text-green-600">
                    {campaign.sentCount}
                  </span>
                </td>

                {/* Failed Count */}
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-medium ${campaign.failedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {campaign.failedCount}
                  </span>
                </td>

                {/* Progress Bar */}
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${campaign.progressPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium min-w-[35px]">
                      {campaign.progressPercentage}%
                    </span>
                  </div>
                </td>

                {/* Last Run */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {campaign.startedAt 
                    ? formatDate(campaign.startedAt)
                    : <span className="text-gray-400 italic">Never run</span>
                  }
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center space-x-1">
                    {/* View Button */}
                    <button
                      onClick={() => onViewDetails(campaign)}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="View Details"
                    >
                      View
                    </button>

                    {/* Start Button (for DRAFT/READY) */}
                    {(campaign.status === 'DRAFT' || campaign.status === 'READY') && (
                      <button
                        onClick={() => handleAction(campaign.id, 'START')}
                        disabled={actionLoading === campaign.id}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="Start Campaign"
                      >
                        {actionLoading === campaign.id ? '⏳' : '▶️'}
                      </button>
                    )}

                    {/* Pause Button (for RUNNING) */}
                    {campaign.status === 'RUNNING' && (
                      <button
                        onClick={() => handleAction(campaign.id, 'PAUSE')}
                        disabled={actionLoading === campaign.id}
                        className="px-2 py-1 text-xs font-medium text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded transition-colors disabled:opacity-50"
                        title="Pause Campaign"
                      >
                        {actionLoading === campaign.id ? '⏳' : '⏸️'}
                      </button>
                    )}

                    {/* Resume Button (for PAUSED) */}
                    {campaign.status === 'PAUSED' && (
                      <button
                        onClick={() => handleAction(campaign.id, 'RESUME')}
                        disabled={actionLoading === campaign.id}
                        className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="Resume Campaign"
                      >
                        {actionLoading === campaign.id ? '⏳' : '▶️'}
                      </button>
                    )}

                    {/* Delete Button (for DRAFT, PAUSED, COMPLETED) */}
                    {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') && (
                      <button
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                        disabled={actionLoading === campaign.id}
                        className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete Campaign"
                      >
                        {actionLoading === campaign.id ? '⏳' : '🗑️'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {campaigns.map((campaign) => (
          <div 
            key={campaign.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-base mb-1">
                  {campaign.name}
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Template: <span className="font-medium">{campaign.templateName}</span>
                </p>
                {campaign.dailyCap && (
                  <p className="text-xs text-orange-700 font-medium bg-orange-50 px-2 py-1 rounded inline-block">
                    📅 Cap: {campaign.dailyCap}/day
                  </p>
                )}
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                {campaign.status}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{campaign.totalRecipients}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-green-600">Sent</p>
                <p className="text-lg font-bold text-green-700">{campaign.sentCount}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-red-600">Failed</p>
                <p className="text-lg font-bold text-red-700">{campaign.failedCount}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-600">Progress</span>
                <span className="text-xs font-bold text-gray-900">{campaign.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${campaign.progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Last Run */}
            <div className="mb-3 text-xs text-gray-500">
              Last run: {campaign.startedAt 
                ? formatDate(campaign.startedAt)
                : <span className="italic">Never run</span>
              }
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => onViewDetails(campaign)}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                View Details
              </button>

              {/* Start Button */}
              {(campaign.status === 'DRAFT' || campaign.status === 'READY') && (
                <button
                  onClick={() => handleAction(campaign.id, 'START')}
                  disabled={actionLoading === campaign.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === campaign.id ? '⏳' : '▶️ Start'}
                </button>
              )}

              {/* Pause Button */}
              {campaign.status === 'RUNNING' && (
                <button
                  onClick={() => handleAction(campaign.id, 'PAUSE')}
                  disabled={actionLoading === campaign.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === campaign.id ? '⏳' : '⏸️ Pause'}
                </button>
              )}

              {/* Resume Button */}
              {campaign.status === 'PAUSED' && (
                <button
                  onClick={() => handleAction(campaign.id, 'RESUME')}
                  disabled={actionLoading === campaign.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === campaign.id ? '⏳' : '▶️ Resume'}
                </button>
              )}

              {/* Delete Button */}
              {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED' || campaign.status === 'COMPLETED') && (
                <button
                  onClick={() => handleDelete(campaign.id, campaign.name)}
                  disabled={actionLoading === campaign.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {actionLoading === campaign.id ? '⏳' : '🗑️ Delete'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
