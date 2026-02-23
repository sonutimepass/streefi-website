'use client';

import { useState } from 'react';
import TemplateManagerSection from '../TemplateManagerSection';
import CampaignSection from '../CampaignSection';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns'>('templates');
  const isBypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Dev Mode Warning Banner */}
      {isBypassMode && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 mb-6 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                🔓 Development Mode - Authentication Bypassed
              </p>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold mb-6">WhatsApp Admin Dashboard</h1>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded ${
            activeTab === 'templates' ? 'bg-black text-white' : 'bg-white border'
          }`}
        >
          Templates
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded ${
            activeTab === 'campaigns' ? 'bg-black text-white' : 'bg-white border'
          }`}
        >
          Campaigns
        </button>
      </div>

      {activeTab === 'templates' && <TemplateManagerSection />}
      {activeTab === 'campaigns' && <CampaignSection />}
    </div>
  );
}
