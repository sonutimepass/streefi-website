import { useState } from 'react';

const benefits = [
  {
    emoji: "📱",
    title: "Increased Visibility",
    description: "Get discovered by thousands of food lovers in your area. Our platform brings customers right to your doorstep.",
    result: "3x more daily customers",
    gradient: "from-green-50 to-emerald-50"
  },
  {
    emoji: "💰",
    title: "Steady Revenue Growth",
    description: "Grow your business consistently. Our vendors see an average 50% revenue increase within 6 months.",
    result: "Average growth: ₹5,000 - ₹15,000/month",
    gradient: "from-orange-50 to-amber-50"
  },
  {
    emoji: "⭐",
    title: "Build Your Reputation",
    description: "Real reviews from real customers. Establish trust and become a beloved neighborhood favorite.",
    result: "Average rating: 4.7/5 stars",
    gradient: "from-green-50 to-emerald-50"
  }
];

export default function MobileView() {
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const toggleCard = (index: number) => {
    setExpandedCard(expandedCard === index ? null : index);
  };

  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            How Streefi Helps Vendors <span className="text-[#06c167]">Grow</span>
          </h2>
          <p className="text-gray-600 text-base max-w-md mx-auto">
            From visibility to steady income, discover how our platform empowers food entrepreneurs
          </p>
        </div>

        <div className="space-y-6">
          {benefits.map((benefit, index) => (
            <div 
              key={benefit.title}
              className={`bg-gradient-to-br ${benefit.gradient} p-6 rounded-2xl border-2 border-gray-200 transition-all duration-300 ${expandedCard === index ? 'border-[#06c167]' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{benefit.emoji}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900">{benefit.title}</h3>
                    <button 
                      onClick={() => toggleCard(index)}
                      className="text-gray-500 p-2 -mr-2 touch-manipulation active:scale-95 transition-transform"
                      style={{ 
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent'
                      }}
                      aria-label={expandedCard === index ? "Collapse" : "Expand"}
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform duration-300 ${expandedCard === index ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ${expandedCard === index ? 'max-h-48 mt-4' : 'max-h-0'}`}
                  >
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">{benefit.description}</p>
                    <div className="pt-4 border-t border-gray-300">
                      <p className="text-[#06c167] font-semibold text-sm">Result: {benefit.result}</p>
                    </div>
                  </div>
                  
                  {/* Collapsed state indicator */}
                  {expandedCard !== index && (
                    <div className="mt-2">
                      <p className="text-[#06c167] font-semibold text-sm">
                        Result: {benefit.result}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Stats */}
        <div className="mt-10 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-gray-200">
          <div className="text-center">
            <h4 className="text-lg font-bold text-gray-900 mb-2">Trusted by 500+ Vendors</h4>
            <p className="text-gray-600 text-sm mb-4">Join our growing community of food entrepreneurs</p>
            <div className="flex justify-center items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#06c167]">94%</div>
                <div className="text-xs text-gray-600">Satisfaction</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#ff6b35]">50%</div>
                <div className="text-xs text-gray-600">Growth</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#06c167]">4.7★</div>
                <div className="text-xs text-gray-600">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}