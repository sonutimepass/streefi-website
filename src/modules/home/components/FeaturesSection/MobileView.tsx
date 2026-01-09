'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, MapPin, Clock, TrendingUp } from 'lucide-react';

export default function MobileView() {
  const [currentVendor, setCurrentVendor] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showPopup, setShowPopup] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const vendors = [
    {
      id: '1',
      name: 'Rajesh Chaat Corner',
      specialty: 'Authentic North Indian Chaat',
      rating: 4.8,
      since: '2015',
      image: '/assets/vendor/vendor1.jpg',
      waitTime: '5-10 min',
      location: 'Connaught Place',
      tags: ['Chaat', 'Vegetarian', 'Quick Bites'],
      status: 'open',
      trending: true,
    },
    {
      id: '2',
      name: 'Mumbai Pav Bhaji',
      specialty: 'Spicy Mumbai Street Food',
      rating: 4.7,
      since: '2018',
      image: '/assets/vendor/vendor2.jpg',
      waitTime: '8-12 min',
      location: 'Karol Bagh',
      tags: ['Pav Bhaji', 'Spicy', 'Popular'],
      status: 'open',
      trending: false,
    },
    {
      id: '3',
      name: 'Sharma Ji Momos',
      specialty: 'Steamed & Fried Momos',
      rating: 4.9,
      since: '2016',
      image: '/assets/vendor/vendor3.jpg',
      waitTime: '6-10 min',
      location: 'Lajpat Nagar',
      tags: ['Momos', 'Chinese', 'Spicy'],
      status: 'busy',
      trending: true,
    },
    {
      id: '4',
      name: 'Delhi Rolls & Wraps',
      specialty: 'Kathi Rolls & Wraps',
      rating: 4.6,
      since: '2019',
      image: '/assets/vendor/vendor4.jpg',
      waitTime: '10-15 min',
      location: 'Saket',
      tags: ['Rolls', 'Non-Veg', 'Wraps'],
      status: 'open',
      trending: false,
    },
    {
      id: '5',
      name: 'South Indian Dosa',
      specialty: 'Crispy Dosa Varieties',
      rating: 4.8,
      since: '2014',
      image: '/assets/vendor/vendor5.jpg',
      waitTime: '7-12 min',
      location: 'Dwarka',
      tags: ['Dosa', 'South Indian', 'Vegetarian'],
      status: 'open',
      trending: true,
    },
    {
      id: '6',
      name: 'Tikki & Chaat Hub',
      specialty: 'Aloo Tikki & Street Chaat',
      rating: 4.7,
      since: '2017',
      image: '/assets/vendor/vendor6.jpg',
      waitTime: '5-8 min',
      location: 'Nehru Place',
      tags: ['Tikki', 'Chaat', 'Budget-Friendly'],
      status: 'open',
      trending: false,
    },
    {
      id: '7',
      name: 'Biryani Point',
      specialty: 'Authentic Hyderabadi Biryani',
      rating: 4.9,
      since: '2013',
      image: '/assets/vendor/vendor7.jpg',
      waitTime: '15-20 min',
      location: 'Chandni Chowk',
      tags: ['Biryani', 'Non-Veg', 'Aromatic'],
      status: 'busy',
      trending: true,
    },
    {
      id: '8',
      name: 'Kulfi Corner',
      specialty: 'Traditional Indian Ice Cream',
      rating: 4.6,
      since: '2016',
      image: '/assets/vendor/vendor8.jpg',
      waitTime: '3-5 min',
      location: 'Rajouri Garden',
      tags: ['Dessert', 'Kulfi', 'Cold Treats'],
      status: 'open',
      trending: false,
    },
  ];

  const filteredVendors = vendors;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVendor((prev) => (prev + 1) % vendors.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [vendors.length]);

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    setShowPopup(true);
  };

  const handleViewMenu = () => {
    setShowPopup(true);
  };

  return (
    <section id="features-mobile" className="py-16 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#06c167]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#ff6b35]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#06c167] to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-medium mb-3 shadow-md">
            <TrendingUp className="w-3 h-3" />
            Live & Trending
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Featured{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b35] to-orange-600">
              Vendors
            </span>
          </h2>
          <p className="text-gray-600 text-base max-w-md mx-auto">
            Discover the most popular street food vendors near you
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => handleFilterClick('trending')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeFilter === 'trending'
                ? 'bg-[#ff6b35] text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#ff6b35]'
            }`}
          >
            🔥 Trending
          </button>
          <button
            onClick={() => handleFilterClick('near')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeFilter === 'near'
                ? 'bg-[#06c167] text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#06c167]'
            }`}
          >
            📍 Near You
          </button>
          <button
            onClick={() => handleFilterClick('top')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeFilter === 'top'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-amber-500'
            }`}
          >
            ⭐ Top Rated
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredVendors.map((vendor, index) => (
            <div
              key={vendor.id}
              onMouseEnter={() => setHoveredCard(vendor.id)}
              onMouseLeave={() => setHoveredCard(null)}
              className={`group relative bg-white backdrop-blur-sm p-5 rounded-2xl border-2 transition-all duration-500 shadow-md ${
                index === currentVendor
                  ? 'border-[#ff6b35] shadow-lg'
                  : 'border-gray-200 hover:border-[#06c167]'
              } ${hoveredCard === vendor.id ? 'shadow-xl' : ''}`}
            >
              {vendor.trending && (
                <div className="absolute -top-2 left-3 z-10">
                  <div className="bg-gradient-to-r from-[#ff6b35] to-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 shadow-lg">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </div>
                </div>
              )}

              <div className="text-center mb-4">
                <div className="relative mb-3">
                  <div className="w-full h-32 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl overflow-hidden shadow-md border border-green-100">
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      width={280}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {index === currentVendor && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-ping">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {vendor.name}
                </h3>

                <p className="text-gray-600 text-xs mb-2">{vendor.specialty}</p>

                <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                  {vendor.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-gray-50 text-gray-700 text-xs rounded-full border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(vendor.rating)
                              ? 'text-[#ff6b35] fill-[#ff6b35]'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-900 font-bold text-sm">{vendor.rating}</span>
                  </div>
                  <span className="text-gray-900 font-medium text-xs">Verified</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-[#06c167]" />
                    {vendor.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <Clock className="w-3.5 h-3.5 text-[#06c167]" />
                    Since {vendor.since}
                  </div>
                </div>

                <button
                  onClick={handleViewMenu}
                  className="w-full mt-3 bg-[#048a46] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#c75429] transition-all duration-300 shadow-md"
                >
                  View Menu & Location
                </button>
              </div>
            </div>
          ))}
        </div>

        {showPopup && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowPopup(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#06c167] to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">📱</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Download Customer App</h3>
                <p className="text-gray-600 text-sm">View menus, explore vendors, and get exclusive deals!</p>
              </div>

              <div className="space-y-2.5 mb-4">
                <a
                  href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2.5 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-all duration-200"
                >
                  <Image src="/assets/playstore.svg" alt="Google Play" width={24} height={24} className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-xs text-gray-300">Get it on</p>
                    <p className="text-sm font-semibold">Google Play</p>
                  </div>
                </a>

                <a
                  href="https://apps.apple.com/in/app/streefi/id6747432924"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-2.5 bg-black hover:bg-gray-900 text-white px-5 py-3 rounded-xl transition-all duration-200"
                >
                  <Image src="/assets/appstore.svg" alt="App Store" width={24} height={24} className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-xs text-gray-300">Download on the</p>
                    <p className="text-sm font-semibold">App Store</p>
                  </div>
                </a>
              </div>

              <button
                onClick={() => setShowPopup(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {filteredVendors.length === 0 && (
          <div className="text-center py-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center border-2 border-gray-200">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No vendors available</h3>
            <p className="text-gray-600 text-sm mb-4">Check back later for new vendors in your area.</p>
          </div>
        )}

        <div className="text-center mt-10">
          <button
            onClick={() => {
              const vendorElement = document.getElementById('vendors');
              if (vendorElement) {
                vendorElement.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.location.href = '/vendor#vendors';
              }
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#048a46] text-white rounded-full text-sm font-medium hover:bg-[#c75429] transition-all duration-300 shadow-md group"
          >
            <span>View All Verified Vendors</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>

          <p className="text-gray-600 text-xs mt-3">
            New vendors added daily • Real-time status updates • 100% verified
          </p>
        </div>
      </div>
    </section>
  );
}
