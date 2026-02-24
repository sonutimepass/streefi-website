export default function CampaignSection() {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">Campaign Sender</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-medium text-blue-900">Coming Soon</h3>
            <p className="mt-1 text-xs sm:text-sm text-blue-700">
              Campaign management features are under development. You'll soon be able to send bulk WhatsApp messages to multiple recipients.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
