'use client';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';

export default function EmailFormSection() {
  const {
    messageType,
    setMessageType,
    to,
    setTo,
    subject,
    setSubject,
    message,
    setMessage,
    sending,
    statusMessage,
    statusType,
    handleSendEmail,
    messageLog,
    bulkEmails,
    setBulkEmails,
    handleSendBulkEmail,
    handleFileUpload,
    importedEmails,
  } = useEmailAdminContext();

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 w-full max-w-4xl mx-auto">
      {/* Message Type Selector */}
      <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 justify-center flex-wrap">
        <button
          onClick={() => setMessageType('single')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
            messageType === 'single'
              ? 'bg-blue-600 text-white border-2 border-blue-600'
              : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
          }`}
        >
          📨 Single Email
        </button>
        <button
          onClick={() => setMessageType('bulk')}
          className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
            messageType === 'bulk'
              ? 'bg-purple-600 text-white border-2 border-purple-600'
              : 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50'
          }`}
        >
          📬 Bulk Email
        </button>
      </div>

      {/* Single Email Form */}
      {messageType === 'single' && (
        <div className="bg-blue-50 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Single Email Sender</h2>

          <form onSubmit={handleSendEmail}>
            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                To Email Address
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your email message here..."
                rows={6}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className={`w-full py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white rounded-md transition-colors duration-200 ${
                sending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {sending ? 'Sending...' : '📧 Send Email'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Email Form */}
      {messageType === 'bulk' && (
        <div className="bg-purple-50 p-4 sm:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-900">Bulk Email Sender</h2>

          <form onSubmit={handleSendBulkEmail}>
            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Upload CSV/Excel File (Optional)
              </label>
              <label className="inline-flex items-center px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-purple-600 bg-white border-2 border-purple-600 rounded-lg cursor-pointer hover:bg-purple-600 hover:text-white transition-colors duration-200 mb-2 sm:mb-3">
                📁 Choose CSV/Excel File
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
              </label>

              {importedEmails.length > 0 && (
                <div className="text-xs sm:text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md font-medium">
                  ✅ Imported {importedEmails.length} email addresses from file
                </div>
              )}
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Paste Email Addresses (one per line)
              </label>
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                rows={5}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block mb-2 text-sm sm:text-base font-medium text-gray-700">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your email message here..."
                rows={6}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-vertical"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className={`w-full py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white rounded-md transition-colors duration-200 ${
                sending
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {sending ? 'Sending...' : '📬 Send Bulk Emails'}
            </button>
          </form>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className={`p-3 sm:p-4 mb-4 sm:mb-6 rounded-lg border ${
          statusType === 'success'
            ? 'bg-green-50 border-green-500'
            : statusType === 'error'
            ? 'bg-red-50 border-red-500'
            : 'bg-blue-50 border-blue-500'
        }`}>
          <p className={`text-xs sm:text-sm font-medium ${
            statusType === 'success'
              ? 'text-green-800'
              : statusType === 'error'
              ? 'text-red-800'
              : 'text-blue-800'
          }`}>
            {statusMessage}
          </p>
        </div>
      )}

      {/* Message Log */}
      {messageLog.length > 0 && (
        <div>
          <h3 className="text-base sm:text-lg font-bold mb-2 sm:mb-3 text-gray-900">
            📊 Email Log
          </h3>
          <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg">
            {messageLog.map((log, index) => (
              <div
                key={index}
                className={`p-3 sm:p-4 ${
                  index < messageLog.length - 1 ? 'border-b border-gray-200' : ''
                } ${log.status === 'success' ? 'bg-green-50' : 'bg-red-50'}`}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-0 mb-2">
                  <span className="font-semibold text-xs sm:text-sm text-gray-900 break-all">
                    {log.to}
                  </span>
                  <span className={`text-xs font-semibold self-start sm:self-auto ${
                    log.status === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {log.status === 'success' ? '✅ Sent' : '❌ Failed'}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-700 mb-1">
                  <strong>Subject:</strong> {log.subject}
                </div>
                <div className="text-xs text-gray-500">
                  {log.timestamp}
                </div>
                {log.error && (
                  <div className="text-xs text-red-700 mt-2 break-words">
                    Error: {log.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
