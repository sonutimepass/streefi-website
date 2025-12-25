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

export default function DesktopView() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            How Streefi Helps Vendors <span className="text-[#06c167]">Grow</span>
          </h2>
          <p className="text-gray-600 text-xl max-w-3xl mx-auto leading-relaxed">
            From visibility to steady income, discover how our platform empowers food entrepreneurs
          </p>
        </div>

        <div className="grid grid-cols-3 gap-10">
          {benefits.map((benefit) => (
            <div 
              key={benefit.title}
              className={`relative bg-gradient-to-br ${benefit.gradient} p-10 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-300 hover:scale-105 hover:shadow-2xl group overflow-hidden`}
            >
              {/* Background shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              
              <div className="relative z-10">
                <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-300">{benefit.emoji}</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">{benefit.title}</h3>
                <p className="text-gray-700 text-lg leading-relaxed mb-6">{benefit.description}</p>
                <div className="mt-8 pt-6 border-t border-gray-300/70 group-hover:border-gray-400 transition-colors">
                  <p className="text-[#06c167] font-bold text-lg">Result: {benefit.result}</p>
                </div>
              </div>
              
              {/* Corner accents */}
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#06c167]/30 rounded-tr-2xl"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#06c167]/30 rounded-bl-2xl"></div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative Bottom Section */}
      <div className="max-w-7xl mx-auto mt-16 pt-12">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t-2 border-gray-300"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-8 py-3">
              <div className="flex items-center gap-4">
                <div className="h-4 w-4 bg-[#06c167] rounded-full animate-pulse"></div>
                <div className="h-3 w-3 bg-[#ff6b35] rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="h-4 w-4 bg-[#06c167] rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <span className="text-gray-500 text-sm font-medium ml-2">Trusted by 500+ vendors</span>
              </div>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}