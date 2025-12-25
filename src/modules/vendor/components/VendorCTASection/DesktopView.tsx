'use client';
import Image from 'next/image';
import { useState } from 'react';

export default function DesktopView() {
  const [showPopup, setShowPopup] = useState(false);

  const handleApplyVendor = () => {
    setShowPopup(true);
  };

  const handleLearnMore = () => {
    window.location.href = '/policies/policy#vendor';
  };

  return (
    <>
      <section className="py-12 px-6 bg-gradient-to-br from-green-50 to-emerald-50 border-y-2 border-green-200">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            Ready to Join Our <span className="text-emerald-700">Vendor Community</span>?
          </h2>
          <p className="text-gray-700 text-lg mb-8 max-w-2xl mx-auto">
            Become a Streefi vendor and grow your street food business. Get discovered by thousands of customers, offer dine-in discounts, and complete business support.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleApplyVendor}
              className="px-8 py-4 bg-gradient-to-r from-[#06c167] to-emerald-600 hover:from-[#05a857] hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/25"
            >
              Apply as Vendor
            </button>
            <button
              onClick={handleLearnMore}
              className="px-8 py-4 border-2 border-[#06c167] text-emerald-700 font-semibold rounded-xl hover:bg-green-50 transition-all duration-200"
            >
              Learn More
            </button>
          </div>

          <p className="text-gray-600 text-sm mt-8">✓ Free to join  • ✓ Transparent pricing</p>
        </div>

        {/* Decorative Bottom Pattern */}
        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex justify-center items-center gap-4">
            <div className="flex gap-1">
              <div className="h-8 w-1 bg-[#06c167] rounded-full"></div>
              <div className="h-6 w-1 bg-[#06c167]/70 rounded-full"></div>
              <div className="h-4 w-1 bg-[#06c167]/40 rounded-full"></div>
            </div>
            <div className="h-px w-32 bg-gradient-to-r from-[#06c167] to-transparent"></div>
            <div className="text-2xl">🍜</div>
            <div className="h-px w-32 bg-gradient-to-l from-[#06c167] to-transparent"></div>
            <div className="flex gap-1">
              <div className="h-4 w-1 bg-[#06c167]/40 rounded-full"></div>
              <div className="h-6 w-1 bg-[#06c167]/70 rounded-full"></div>
              <div className="h-8 w-1 bg-[#06c167] rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Vendor App Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPopup(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mb-4 text-5xl">📱</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Download Vendor App</h3>
              <p className="text-gray-600 mb-6">Get the Streefi Vendor app to start managing your business</p>

              <div className="space-y-3">
                <a
                  href="https://play.google.com/store/apps/details?id=com.streefi.vendor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all"
                >
                  <Image src="/assets/playstore.svg" alt="Google Play" width={24} height={24} className="w-6 h-6" />
                  <div className="text-left">
                    <p className="text-xs text-gray-300">Get it on</p>
                    <p className="text-sm font-semibold">Google Play</p>
                  </div>
                </a>

                <a
                  href="https://apps.apple.com/in/app/streefi-vendor-partners/id6747433347"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center space-x-3 bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all"
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
                className="mt-6 text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
