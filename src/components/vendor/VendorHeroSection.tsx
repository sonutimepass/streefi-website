import Link from 'next/link';

export default function VendorHeroSection() {
  return (
    <section className="relative py-16 px-6 bg-white">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-orange-400 rounded-full blur-3xl"></div>
      </div>
 <div className="pt-16"></div>
      <div className="max-w-6xl mx-auto relative z-10 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Our <span className="bg-gradient-to-r from-[#06c167] to-emerald-500 bg-clip-text text-transparent">Street Food Heroes</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Meet the incredible vendors who are revolutionizing street food across India. Each one brings authentic flavors, dedication, and passion to every meal.
        </p>
        <Link 
          href="#vendors" 
          className="inline-block px-8 py-4 bg-gradient-to-r from-[#06c167] to-emerald-600 hover:from-[#05a857] hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all duration-300 transform hover:scale-105"
        >
          Explore Vendors
        </Link>
      </div>
      
      {/* Wave Shape Divider */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
        <svg className="relative block w-full h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-gray-50"></path>
        </svg>
      </div>
    </section>
  );
}
