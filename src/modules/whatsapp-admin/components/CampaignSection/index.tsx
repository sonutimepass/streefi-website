/**
 * Campaign Manager Section - Production-Ready
 * 
 * Full campaign management UI with:
 * - Campaign list view (no manual ID entry)
 * - Route-based navigation to campaign detail pages
 * - Real-time metrics display
 * - Campaign creation modal
 * 
 * Phase 1A: Manual execution via button
 * Future: Automated cron/queue triggers
 */

'use client';

import { useState, useEffect } from 'react';
import CampaignListTable, { CampaignListItem } from '../CampaignListTable';
import CampaignCreationModal from '../CampaignCreationModal';

export default function CampaignSection() {
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreationModal, setShowCreationModal] = useState(false);

  // Load campaigns on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Load all campaigns
  const loadCampaigns = async () => {
    console.log('📋 [Campaign Section] Loading campaigns...');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns/list');
      const data = await response.json();
      console.log('📥 [Campaign Section] Campaigns loaded:', data.campaigns?.length || 0);

      if (!response.ok) {
        console.error('❌ [Campaign Section] Failed to load campaigns:', data.error);
        throw new Error(data.error || 'Failed to load campaigns');
      }

      console.log('✅ [Campaign Section] Campaigns loaded successfully');
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle campaign created
  const handleCampaignCreated = () => {
    loadCampaigns(); // Refresh list
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          Campaign Manager
        </h2>
        <button
          onClick={() => setShowCreationModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Create Campaign</span>
          <span className="sm:hidden">Create</span>
        </button>
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

      {/* Campaign List Table */}
      <CampaignListTable
        campaigns={campaigns}
        loading={loading}
        onRefresh={loadCampaigns}
      />

      {/* Campaign Creation Modal */}
      <CampaignCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onCreated={handleCampaignCreated}
      />
    </div>
  );
}
