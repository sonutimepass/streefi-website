'use client';
import Image from 'next/image';
import { useState } from 'react';

interface Vendor {
  _id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  location: string;
  experience: number;
  revenueGrowth: number;
}

interface MobileViewProps {
  vendors: Vendor[];
  loading: boolean;
}

export default function MobileView({ vendors, loading }: MobileViewProps) {
  const [showPopup, setShowPopup] = useState(false);

  const handleViewMenu = () => {
    setShowPopup(true);
  };

  return (
    <section id="vendors" className="py-6 px-4 bg-white">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Featured <span className="text-emerald-700">Vendors</span>
          </h2>
          <p className="text-gray-600 text-sm">Discover authentic street food from our verified vendors</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-green-200 border-t-[#06c167] rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 mt-3 text-sm">Loading vendors...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {vendors.map((vendor) => (
              <div
                key={vendor._id}
                className="bg-white rounded-xl overflow-hidden border-2 border-gray-200 active:border-[#06c167] transition-all duration-300 shadow-md"
              >
                {/* Vendor Image */}
                <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  {vendor.image ? (
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🍜</div>
                  )}
                  <div className="absolute top-3 right-3 bg-[#06c167] text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                    ⭐ {vendor.rating.toFixed(1)}
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{vendor.name}</h3>
                  <p className="text-emerald-700 font-semibold text-sm mb-2">{vendor.specialty}</p>

                  <div className="space-y-1 mb-3">
                    <p className="text-gray-700 text-xs line-clamp-2">{vendor.description}</p>
                    <div className="flex items-center text-gray-600 text-xs">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {vendor.location}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-200">
                    <div>
                      <p className="text-gray-600 text-xs mb-0.5">Experience</p>
                      <p className="text-[#06c167] font-bold text-sm">{vendor.experience} yrs</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs mb-0.5">Growth</p>
                      <p className="text-[#ff6b35] font-bold text-sm">+{vendor.revenueGrowth}%</p>
                    </div>
                  </div>

                  {/* Verified Badge */}
                  <div className="flex items-center justify-center mb-3">
                    <span className="text-gray-900 font-medium text-sm">
                      Verified
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={handleViewMenu}
                    className="w-full bg-gradient-to-r from-[#06c167] to-emerald-600 active:from-[#05a857] active:to-emerald-700 text-white font-semibold py-2.5 text-sm rounded-lg transition-all duration-200 active:scale-95 shadow-lg shadow-green-500/25"
                  >
                    View Menu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App Download Popup */}
      {showPopup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-[#06c167] to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Download Customer App</h3>
              <p className="text-gray-600 text-sm">View menus, explore vendors, and get exclusive deals!</p>
            </div>

            <div className="space-y-2.5 mb-5">
              <a
                href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-3 bg-black active:bg-gray-900 text-white px-5 py-3 rounded-xl transition-all duration-200 active:scale-95"
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
                className="flex items-center justify-center space-x-3 bg-black active:bg-gray-900 text-white px-5 py-3 rounded-xl transition-all duration-200 active:scale-95"
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
              className="w-full bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Decorative Bottom Border */}
      <div className="mt-8 pt-6">
        <div className="flex justify-center items-center gap-2">
          <div className="h-1 w-12 bg-gradient-to-r from-transparent to-[#06c167] rounded-full"></div>
          <div className="h-1.5 w-1.5 bg-[#06c167] rounded-full"></div>
          <div className="h-1 w-20 bg-gradient-to-r from-[#06c167] via-emerald-400 to-[#ff6b35] rounded-full"></div>
          <div className="h-1.5 w-1.5 bg-[#ff6b35] rounded-full"></div>
          <div className="h-1 w-12 bg-gradient-to-l from-transparent to-[#ff6b35] rounded-full"></div>
        </div>
      </div>
    </section>
  );
}
