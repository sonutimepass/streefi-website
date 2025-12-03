export default function SupportFAQSection() {
  const faqs = [
    {
      question: 'How do I update my profile information?',
      answer: 'You can update your profile information by navigating to the \'Settings\' section within the app. From there, select \'Edit Profile\' to change your name, email, or other personal details.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We take data privacy and security very seriously. All data is encrypted both in transit and at rest. For more details, please review our Privacy Policy, which is available within the app and on our website.'
    }
  ];

  return (
    <div id="FAQs" className="bg-white p-8 rounded-xl shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Frequently Asked Questions</h2>
      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <details key={index} className="group border border-gray-200 rounded-lg hover:border-green-300 transition-colors">
            <summary className="flex items-center justify-between cursor-pointer list-none p-4 bg-gray-50 hover:bg-green-50 rounded-lg">
              <span className="font-semibold text-gray-700">{faq.question}</span>
              <span className="text-green-600 group-open:rotate-180 transition-transform">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </span>
            </summary>
            <div className="mt-2 p-4 text-gray-600 border-t border-gray-200">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
