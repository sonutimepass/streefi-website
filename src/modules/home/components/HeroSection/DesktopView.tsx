'use client';
import Image from 'next/image';

export default function DesktopView() {

  return (
    <section id="hero-section" className="relative min-h-[70vh] pt-20 md:pt-25 pb-4 px-2 overflow-hidden" style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #f0fdf4 30%, #f0fdf4 70%, #f0fdf4 100%)' }} aria-label="Hero section">
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] z-0">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      {/* Content */}
      <div className="max-w-6xl mx-auto relative z-20 pb-14 px-4 lg:px-7">
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 lg:gap-10">
          
          {/* Top Section - Text Content (Centered) */}
          <div className="w-full max-w-6xl">
            <div className="space-y-4 lg:space-y-5 text-center">
              {/* Badge */}
              <div className="inline-block animate-[fadeIn_0.6s_ease-out]">
                <div className="text-sm sm:text-base md:text-lg font-bold bg-[#06c167]/10 backdrop-blur-md border-2 border-[#06c167]/30 text-[#06c167] px-6 py-2 rounded-full shadow-lg shadow-[#06c167]/10">
                  India's #1 Street Food Finder App*
                </div>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-black leading-tight animate-[fadeIn_0.8s_ease-out_0.2s_both]">
                Find Street Food
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-black via-gray-900 to-[#06c167]">
                  Near You
                </span>
              </h1>

              {/* Download Buttons */}
              <div className="space-y-4 pt-2 animate-[fadeIn_1s_ease-out_0.4s_both]">
                <p className="text-gray-700 text-base md:text-lg font-medium">Available on both platforms</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <a
                    href="https://apps.apple.com/in/app/streefi/id6747432924"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download Streefi on the App Store"
                    className="group relative flex items-center justify-center space-x-3 bg-white/90 backdrop-blur-sm border-2 border-transparent hover:border-[#06c167] hover:bg-green-200 text-gray-900 px-7 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-[#06c167]/20 transition-all duration-500 hover:scale-105 text-sm min-w-[220px]"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Image
                      src="/assets/appstore.svg"
                      alt="App Store"
                      width={24}
                      height={24}
                      className="w-6 h-6 transition-all duration-300 group-hover:scale-110"
                    />
                    <div className="text-left">
                      <p className="text-xs text-gray-600 font-medium">Download on the</p>
                      <p className="text-base font-bold text-gray-900">App Store</p>
                    </div>
                  </a>

                  <a
                    href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download Streefi on Google Play"
                    className="group relative flex items-center justify-center space-x-3 bg-white/95 backdrop-blur-sm border-2 border-transparent hover:border-[#06c167] hover:bg-green-200 text-gray-900 px-7 py-4 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-[#06c167]/20 transition-all duration-500 hover:scale-105 text-sm min-w-[220px]"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <Image
                      src="/assets/playstore.svg"
                      alt="Google Play"
                      width={24}
                      height={24}
                      className="w-6 h-6 transition-all duration-300 group-hover:scale-110"
                    />
                    <div className="text-left">
                      <p className="text-xs text-gray-600 font-medium">Get it on</p>
                      <p className="text-base font-bold text-gray-900">Google Play</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Custom CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}