'use client';

import AdminHeader from '@/components/common/AdminHeader';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';
import EmailFormSection from '../EmailFormSection';

export default function DashboardLayout() {
  const { logout } = useEmailAdminContext();
  const isBypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader 
        title="Email Admin" 
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

        {/* Dashboard Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Email Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Send emails via Zoho Mail API</p>
        </div>

        {/* Email Form Content */}
        <EmailFormSection />
      </main>
    </div>
  );
}
