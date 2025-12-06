export default function SupportFAQSection() {
const faqs = [
  {
    question: 'How do I find nearby street food vendors?',
    answer:
      'Enable location permissions. The app reads your GPS once, fetches vendors within range, and shows them on the home screen. If nothing loads, your GPS accuracy is low or permissions are disabled.'
  },
  {
    question: 'How does the dine-in module work?',
    answer:
      'If a vendor supports dine-in, you’ll see them Offers Section.'
  },
  {
    question: 'Can I explore different cuisines?',
    answer:
      'Yes. Use the Explore tab, which indexes vendors by cuisine and dish tags. Filters update results instantly—no reloads.'
  },

  {
    question: 'How do I update my profile information?',
    answer:
      'Go to Settings → Edit Profile. You can change your name, and other basic details. Updates sync to the server instantly.'
  },
  {
    question: 'Is my data secure?',
    answer:
      'All API requests use HTTPS. Sensitive data is encrypted at rest. Only essential permissions are requested. Nothing is shared with vendors except your bill details.'
  },
  {
    question: 'Why can’t I see some vendors?',
    answer:
      'Either the vendor is offline, out of your radius, or temporarily disabled by the admin panel. The app hides inactive vendors automatically.'
  },
  {
    question: 'How are vendor ratings calculated?',
    answer:
      'Ratings are an average of verified customer reviews. Spam detection removes duplicate or suspicious ratings before aggregation.'
  },
  {
    question: 'How do I report an issue with a vendor?',
    answer:
      'Open the profile → Report. The complaint is logged in the admin panel for review.'
  },
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
