'use client';

import { useRouter } from 'next/navigation';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import EmergencyKillSwitch from '../EmergencyKillSwitch';
import GlobalSendingStateIndicator from '../GlobalSendingStateIndicator';
import GlobalSettingsPanel from '../GlobalSettingsPanel';

/**
 * Settings Page
 * 
 * Shows:
 * - Global rate limits
 * - System-wide controls
 * - Safety buffers
 */
export default function SettingsPageContent() {
  const router = useRouter();
  const { logout } = useWhatsAppAdminContext();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Kill Switch */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/whatsapp-admin/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Settings</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Global rate limits and controls</p>
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
        <GlobalSettingsPanel />
      </main>
    </div>
  );
}
