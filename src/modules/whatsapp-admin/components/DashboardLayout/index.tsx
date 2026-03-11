'use client';

import { useState } from 'react';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import AdminHeader from '@/components/common/AdminHeader';
import TemplateManagerSection from '../TemplateManagerSection';
import CampaignSection from '../CampaignSection';
import GlobalSettingsPanel from '../GlobalSettingsPanel';
import EmergencyKillSwitch from '../EmergencyKillSwitch';
import GlobalSendingStateIndicator from '../GlobalSendingStateIndicator';

export default function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<'templates' | 'campaigns' | 'settings'>('templates');
  const { logout } = useWhatsAppAdminContext();
  const isBypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header with Kill Switch */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Title */}
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">WhatsApp Admin</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Production Control Center</p>
            </div>

            {/* Right: Status + Kill Switch + Inbox + Logout */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <GlobalSendingStateIndicator />
              <div className="relative">
                <EmergencyKillSwitch />
              </div>
              <a
                href="/whatsapp-admin/inbox"
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-1"
              >
                <span>💬</span>
                <span className="hidden sm:inline">Inbox</span>
              </a>
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
          <p className="text-sm sm:text-base text-gray-600">Manage templates, campaigns, and system settings</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-4 sm:mb-6 flex flex-wrap gap-1 w-full sm:w-auto">
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

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md text-sm sm:text-base font-medium transition-all duration-200 ${
              activeTab === 'settings' 
                ? 'bg-black text-white shadow-sm' 
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">⚙️ Settings</span>
            <span className="sm:hidden">⚙️</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-300">
          {activeTab === 'templates' && <TemplateManagerSection />}
          {activeTab === 'campaigns' && <CampaignSection />}
          {activeTab === 'settings' && <GlobalSettingsPanel />}
        </div>
      </main>
    </div>
  );
}
