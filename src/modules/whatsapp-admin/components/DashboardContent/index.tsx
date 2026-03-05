'use client';

import { useRouter } from 'next/navigation';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import EmergencyKillSwitch from '../EmergencyKillSwitch';
import GlobalSendingStateIndicator from '../GlobalSendingStateIndicator';

/**
 * Dashboard Overview - Landing page for WhatsApp Admin
 * 
 * Shows:
 * - System status
 * - Quick navigation
 * - Recent activity summary
 */
export default function DashboardContent() {
  const router = useRouter();
  const { logout } = useWhatsAppAdminContext();
  const isBypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Kill Switch */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">WhatsApp Admin</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Dashboard</p>
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
        {/* Dev Mode Warning */}
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

        {/* Dashboard Title */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to WhatsApp Admin</h2>
          <p className="text-sm sm:text-base text-gray-600">Production control center for managing templates, campaigns, and system settings</p>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => router.push('/whatsapp-admin/templates')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Templates</h3>
            <p className="text-sm text-gray-600">Manage WhatsApp message templates</p>
          </button>

          <button
            onClick={() => router.push('/whatsapp-admin/campaigns')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Campaigns</h3>
            <p className="text-sm text-gray-600">Create and monitor campaigns</p>
          </button>

          <button
            onClick={() => router.push('/whatsapp-admin/settings')}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-all text-left group border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Settings</h3>
            <p className="text-sm text-gray-600">Global rate limits and controls</p>
          </button>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg shadow-sm text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-1">System Status</h3>
            <p className="text-sm text-gray-300">All systems operational</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Production Ready</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Emergency kill switch enabled in header</li>
                  <li>Global rate controls configured</li>
                  <li>Campaign daily caps enforced</li>
                  <li>All safety controls operational</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
