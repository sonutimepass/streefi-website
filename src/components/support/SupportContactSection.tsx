export default function SupportContactSection() {
  return (
    <div id="help" className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Get in Touch</h2>
      <p className="text-gray-600 mb-6">
        The fastest way to get help is to send us an email. We aim to respond to all inquiries within 24 hours. For the App Store Review Team, please mention &quot;App Review&quot; in your subject line for priority assistance.
      </p>
      <div className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200">
        <svg className="h-6 w-6 text-green-600 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
        <div>
          <a href="mailto:support@streefi.in" className="text-green-600 font-semibold text-lg hover:underline block">support@streefi.in</a>
          <p className="text-green-700 text-sm mt-1">Primary Support Channel</p>
        </div>
      </div>
      
      {/* Additional Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">For Vendors</h4>
          <a href="mailto:streefi.business@gmail.com" className="text-green-600 hover:underline">Vendors</a>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-800 mb-2">Business Inquiries</h4>
          <a href="mailto:streefi.business@gmail.com" className="text-green-600 hover:underline">Business</a>
        </div>
      </div>
    </div>
  );
}
