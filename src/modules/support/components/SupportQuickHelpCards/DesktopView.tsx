export default function DesktopView() {
  const cards = [
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      ),
      title: 'Email Support',
      description: 'Get detailed help from our support team',
      link: 'mailto:support@streefi.in',
      linkText: 'support@streefi.in'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      title: 'FAQ Center',
      description: 'Quick answers to common questions',
      link: '#FAQs',
      linkText: 'Browse FAQs'
    },
    {
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        </svg>
      ),
      title: 'WhatsApp Support',
      description: "We are here when you need us",
      link: 'https://wa.me/917777933650',
      linkText: 'Always Here to Support',
      external: true
    }
  ];

  return (
    <section className="container mx-auto px-6 py-12 -mt-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-200 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {card.icon}
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">{card.title}</h3>
            <p className="text-gray-600 text-sm mb-3">{card.description}</p>
            <a 
              href={card.link} 
              {...(card.external && { target: "_blank", rel: "noopener noreferrer" })}
              className="text-green-600 font-semibold hover:underline"
            >
              {card.linkText}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}