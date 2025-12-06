'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star, Clock, MapPin, Users, Award, TrendingUp } from 'lucide-react';
const vendors = [
  {
    id: 1,
    name: "Hema's Sweet Creation",
    specialty: "Cake & Pastry",
    rating: 4.8,
    since: "2020",
    image: "/assets/vendor/vendor1.jpg",
    waitTime: "5-10 min",
    location: "Gandhinagar",
    tags: ["Family Recipe", "Local Favorite"],
    status: "open",
    trending: true
  },
  {
    id: 2,
    name: "Rasraj",
    specialty: "Fast Food",
    rating: 4.7,
    since: "2015",
    image: "/assets/vendor/vendor11.jpg",
    waitTime: "10-15 min",
    location: "Ahmedabad",
    tags: ["Authentic", "Street Favourite"],
    status: "open",
    trending: false
  },
  {
    id: 3,
    name: "S.R Dabeli Vadapav",
    specialty: "Dabeli & Vada Pav",
    rating: 4.6,
    since: "2020",
    image: "/assets/vendor/vendor3.jpg",
    waitTime: "8-12 min",
    location: "PDPU, Gandhinagar",
    tags: ["Quick Bite", "Best Seller"],
    status: "busy",
    trending: true
  },
  {
    id: 4,
    name: "Pizza Farm",
    specialty: "Pizza & Garlic Bread",
    rating: 4.9,
    since: "2020",
    image: "/assets/vendor/vendor4.jpg",
    waitTime: "2-5 min",
    location: "GH-4, Swarnim Park, Gandhinagar",
    tags: ["Run By Family", "Local Favorite", "Highest Rated"],
    status: "open",
    trending: true
  },
  {
    id: 5,
    name: "Shawarma Junction",
    specialty: "Shawarma & Burger",
    rating: 4.8,
    since: "2019",
    image: "/assets/vendor/vendor5.jpg",
    waitTime: "5-8 min",
    location: "GH-4, Swarnim Park, Gandhinagar",
    tags: ["Local Favorite"],
    status: "open",
    trending: false
  },
  {
    id: 6,
    name: "Shakti Food Zone",
    specialty: "Fast Food",
    rating: 4.6,
    since: "2018",
    image: "/assets/vendor/vendor12.jpg",
    waitTime: "3-5 min",
    location: "Ahmedabad",
    tags: ["Famous", "Local Choice"],
    status: "open",
    trending: false
  },
  {
    id: 7,
    name: "Mom's Kitchen",
    specialty: "Sandwich, Ghughra, Burger",
    rating: 4.6,
    since: "2018",
    image: "/assets/vendor/vendor7.jpg",
    waitTime: "3-5 min",
    location: "GH-4, Swarnim Park, Gandhinagar",
    tags: ["Homely Taste", "Local Choice"],
    status: "open",
    trending: false
  },
  {
    id: 8,
    name: "Burger Boys",
    specialty: "Burgers",
    rating: 4.6,
    since: "2018",
    image: "/assets/vendor/vendor8.jpg",
    waitTime: "3-5 min",
    location: "Gandhinagar",
    tags: ["Local Famous"],
    status: "open",
    trending: false
  }
];

export default function FeaturesSection() {
  const [currentVendor, setCurrentVendor] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleViewMenu = () => {
    setShowPopup(true);
  };

  const handleFilterClick = () => {
    setShowPopup(true);
  };

  // Show all vendors (filters removed, kept for UI)
  const filteredVendors = vendors;

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVendor((prev) => (prev + 1) % filteredVendors.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [filteredVendors.length]);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-emerald-500';
      case 'busy': return 'bg-amber-500';
      case 'closed': return 'bg-rose-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <section id="features" className="relative py-20 px-6 bg-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-amber-500/10 to-orange-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-l from-emerald-500/10 to-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      {/* Geometric Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 left-10 w-64 h-64 border-2 border-amber-300 rotate-45 rounded-3xl"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 border-2 border-emerald-300 rotate-12 rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Discover <span className="text-emerald-700">Local Vendors</span>
          </h2>

          <p className="text-gray-700 text-lg md:text-xl max-w-2xl mx-auto">
            Find authentic street food vendors near you with live ratings and real-time status
          </p>

          {/* Filter Buttons - Now trigger app download */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            <button
              onClick={handleFilterClick}
              className="px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-[#06c167] hover:text-white border border-gray-300 hover:border-[#06c167]"
            >
              <TrendingUp className="w-4 h-4" />
              Trending Now
            </button>
            <button
              onClick={handleFilterClick}
              className="px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-[#06c167] hover:text-white border border-gray-300 hover:border-[#06c167]"
            >
              <MapPin className="w-4 h-4" />
              Near You
            </button>
            <button
              onClick={handleFilterClick}
              className="px-5 py-2 rounded-full transition-all duration-300 flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-[#06c167] hover:text-white border border-gray-300 hover:border-[#06c167]"
            >
              <Star className="w-4 h-4" />
              Top Rated
            </button>
          </div>
        </div>

        {/* Vendor Cards Grid with Enhanced Psychology */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredVendors.map((vendor, index) => (
            <div
              key={vendor.id}
              onMouseEnter={() => setHoveredCard(vendor.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`group relative bg-white backdrop-blur-sm p-6 rounded-3xl border-2 transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-xl ${index === currentVendor
                ? 'border-[#ff6b35] shadow-lg'
                : 'border-gray-200 hover:border-[#06c167]'
                } ${hoveredCard === vendor.id ? 'shadow-xl' : ''}`}
            >
              {/* Trending Badge - Social Proof */}
              {vendor.trending && (
                <div className="absolute -top-3 left-4 z-10">
                  <div className="bg-gradient-to-r from-[#ff6b35] to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 shadow-lg">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </div>
                </div>
              )}

              {/* Vendor Image & Info */}
              <div className="text-center mb-6">
                <div className="relative mb-4">
                  <div className="w-full h-40 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-300 border border-green-100">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      width={320}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {index === currentVendor && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-ping">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
                  {vendor.name}
                </h3>

                <p className="text-gray-600 text-sm mb-3">{vendor.specialty}</p>

                {/* Tags - Social Proof & Uniqueness */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                  {vendor.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-full border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats & Info - Social Proof & Scarcity */}
              <div className="space-y-3">
                {/* Rating with Review Count - Social Proof */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.floor(vendor.rating) ? 'text-[#ff6b35] fill-[#ff6b35]' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-900 font-bold">{vendor.rating}</span>
                  </div>
                  <span className="text-gray-900 font-medium text-sm">
                    Verified
                  </span>
                </div>

                {/* Location & Time - Convenience */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-[#06c167]" />
                    {vendor.location}
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock className="w-4 h-4 text-[#06c167]" />
                    Since {vendor.since}
                  </div>
                </div>

                {/* Call to Action Button - Clear Next Step */}
                <button
                  onClick={handleViewMenu}
                  className="w-full mt-4 bg-[#06c167] text-white py-3 rounded-xl font-medium hover:bg-[#ff6b35] transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  View Menu & Location
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* App Download Popup */}
        {showPopup && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPopup(false)}
          >
            <div
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-[#06c167] to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">📱</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Download Customer App</h3>
                <p className="text-gray-600">View menus, explore vendors, and get exclusive deals!</p>
              </div>

              <div className="space-y-3 mb-6">
                <a
                  href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-3 bg-black hover:bg-gray-900 text-white px-6 py-4 rounded-xl transition-all duration-200 hover:shadow-lg"
                >
                  <Image src="/assets/playstore.svg" alt="Google Play" width={28} height={28} className="w-7 h-7" />
                  <div className="text-left">
                    <p className="text-xs text-gray-300">Get it on</p>
                    <p className="text-base font-semibold">Google Play</p>
                  </div>
                </a>

                <a
                  href="https://apps.apple.com/in/app/streefi/id6747432924"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-3 bg-black hover:bg-gray-900 text-white px-6 py-4 rounded-xl transition-all duration-200 hover:shadow-lg"
                >
                  <Image src="/assets/appstore.svg" alt="App Store" width={28} height={28} className="w-7 h-7" />
                  <div className="text-left">
                    <p className="text-xs text-gray-300">Download on the</p>
                    <p className="text-base font-semibold">App Store</p>
                  </div>
                </a>
              </div>

              <button
                onClick={() => setShowPopup(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredVendors.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-gray-200">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No vendors available</h3>
            <p className="text-gray-600 mb-6">Check back later for new vendors in your area.</p>
          </div>
        )}

        {/* Pagination & View More - Progressive Disclosure */}
        <div className="text-center mt-12">
          <button
            onClick={() => {
              const vendorElement = document.getElementById('vendors');
              if (vendorElement) {
                // If on same page, just scroll
                vendorElement.scrollIntoView({ behavior: 'smooth' });
              } else {
                // Navigate to vendor page with hash
                window.location.href = '/vendor#vendors';
              }
            }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#06c167] text-white rounded-full font-medium hover:bg-[#ff6b35] transition-all duration-300 shadow-md hover:shadow-lg group"
          >
            <span>View All Verified Vendors</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          <p className="text-gray-600 text-sm mt-4">
            New vendors added daily • Real-time status updates • 100% verified
          </p>
        </div>
      </div>
    </section>
  );
}