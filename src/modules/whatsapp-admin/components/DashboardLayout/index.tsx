'use client';

import { useState } from 'react';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import AdminHeader from '@/components/common/AdminHeader';
import TemplateManagerSection from '../TemplateManagerSection';
import CampaignSection from '../CampaignSection';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns'>('templates');
  const { logout } = useWhatsAppAdminContext();
  const isBypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader 
        title="WhatsApp Admin" 
        onLogout={logout} 
        isDev={isBypassMode}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Dev Mode Warning Banner */}
        {isBypassMode && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs sm:text-sm font-medium text-yellow-800">
                  Development Mode - Authentication Bypassed
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Title & Stats */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">WhatsApp Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your WhatsApp templates and campaigns</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-4 sm:mb-6 flex w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-sm sm:text-base font-medium transition-all duration-200 ${
              activeTab === 'templates' 
                ? 'bg-black text-white shadow-sm' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">📝 Templates</span>
            <span className="sm:hidden">📝</span>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-sm sm:text-base font-medium transition-all duration-200 ${
              activeTab === 'campaigns' 
                ? 'bg-black text-white shadow-sm' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">📢 Campaigns</span>
            <span className="sm:hidden">📢</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'templates' && <TemplateManagerSection />}
          {activeTab === 'campaigns' && <CampaignSection />}
        </div>
      </main>
    </div>
  );
}
