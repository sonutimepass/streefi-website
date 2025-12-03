import Link from 'next/link';

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
    description: "Grow your business consistently. Our vendors see an average 150% revenue increase within 6 months.",
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

export default function VendorBenefitsSection() {
  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            How Streefi Helps Vendors <span className="text-[#06c167]">Grow</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            From visibility to steady income, discover how our platform empowers food entrepreneurs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit) => (
            <div 
              key={benefit.title}
              className={`bg-gradient-to-br ${benefit.gradient} p-8 rounded-2xl border-2 border-gray-200 hover:border-[#06c167] transition-all md:hover:transform md:hover:scale-105 active:scale-105 shadow-md`}
            >
              <div className="text-5xl font-bold mb-4">{benefit.emoji}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-gray-700">{benefit.description}</p>
              <div className="mt-6 pt-6 border-t border-gray-300">
                <p className="text-[#06c167] font-semibold">Result: {benefit.result}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative Bottom Section */}
      <div className="max-w-6xl mx-auto mt-12 pt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t-2 border-gray-200"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-6 py-2">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-[#06c167] rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-[#ff6b35] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="h-3 w-3 bg-[#06c167] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
