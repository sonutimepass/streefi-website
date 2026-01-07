'use client';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(
  () => import('@/components/common/ParticleBackground'),
  { ssr: false }
);

export default function DesktopView() {
  return (
    <section className="relative min-h-screen pt-22 md:pt-28 pb-8 px-6 overflow-hidden" style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #0d1025 30%, #06101a 70%, #000510 100%)' }} aria-label="Hero section">
      {/* Particle Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        <ParticleBackground
          particleColor="#ffffff"
          particleCount={600}
          speed={1.2}
        />
      </div>

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
      <div className="max-w-7xl mx-auto relative z-20 pt-8 px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center min-h-[85vh]">
          
          {/* Left Side - Text Content */}
          <div className="space-y-6 lg:space-y-7 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-block animate-[fadeIn_0.6s_ease-out]">
              <div className="text-sm sm:text-base md:text-lg font-bold bg-[#06c167]/10 backdrop-blur-md border-2 border-[#06c167]/30 text-[#06c167] px-5 py-2.5 rounded-full shadow-lg shadow-[#06c167]/10">
                India's #1 Street Food Finder App*
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight animate-[fadeIn_0.8s_ease-out_0.2s_both]">
              Find Street Food
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-[#06c167]">
                Near You
              </span>
            </h1>

            {/* Download Buttons */}
            <div className="space-y-4 animate-[fadeIn_1s_ease-out_0.4s_both]">
              <p className="text-gray-300 text-base font-medium">Available on both platforms</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <a
                  href="https://apps.apple.com/in/app/streefi/id6747432924"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Streefi on the App Store"
                  className="group relative flex items-center justify-center space-x-3 bg-white/95 backdrop-blur-sm border-2 border-transparent hover:border-[#06c167] hover:bg-white text-gray-900 px-6 py-3.5 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-[#06c167]/20 transition-all duration-500 hover:scale-105 text-sm min-w-[200px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Image
                    src="/assets/appstore.svg"
                    alt="App Store"
                    width={22}
                    height={22}
                    className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
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
                  className="group relative flex items-center justify-center space-x-3 bg-white/95 backdrop-blur-sm border-2 border-transparent hover:border-[#06c167] hover:bg-white text-gray-900 px-6 py-3.5 rounded-xl shadow-xl hover:shadow-2xl hover:shadow-[#06c167]/20 transition-all duration-500 hover:scale-105 text-sm min-w-[200px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Image
                    src="/assets/playstore.svg"
                    alt="Google Play"
                    width={22}
                    height={22}
                    className="w-5 h-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12"
                  />
                  <div className="text-left">
                    <p className="text-xs text-gray-600 font-medium">Get it on</p>
                    <p className="text-base font-bold text-gray-900">Google Play</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Scroll Down Indicator */}
            <div className="flex justify-center lg:justify-start mt-4 animate-[fadeIn_1.4s_ease-out_0.8s_both]">
              <button
                onClick={() => window.scrollBy({ top: 400, behavior: 'smooth' })}
                className="flex items-center gap-2 animate-bounce hover:scale-110 transition-transform cursor-pointer group"
                aria-label="Scroll down"
              >
                <span className="text-gray-400 text-xs font-medium tracking-wider group-hover:text-[#06c167] transition-colors">
                  SWIPE DOWN
                </span>
                <svg className="w-4 h-4 text-[#06c167]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Side - Phone Mockup */}
          <div className="relative flex items-center justify-center lg:justify-end animate-[fadeIn_1.2s_ease-out_0.6s_both]">
            <div className="relative w-[280px] sm:w-[300px] md:w-[340px]">
              {/* Phone Shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-12 bg-gradient-to-t from-[#06c167]/40 to-transparent blur-2xl"></div>
              
              {/* Phone Frame */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl shadow-black/50 border border-gray-700">
                {/* Screen Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10"></div>
                
                {/* Screen Content */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-[2.5rem] overflow-hidden aspect-[9/19] border border-gray-800">
                  {/* App Screenshot */}
                  <Image
                    src="/assets/Screenshot.webp"
                    alt="Streefi App Screenshot"
                    fill
                    loading="lazy"
                    className="object-cover object-top"
                    sizes="(max-width: 640px) 280px, (max-width: 768px) 300px, 340px"
                  />
                  
                  {/* Floating emojis */}
                  <div className="absolute top-1/4 -left-4 w-8 h-8 bg-gradient-to-br from-[#06c167]/20 to-transparent backdrop-blur-sm rounded-full flex items-center justify-center border border-[#06c167]/30 animate-float">
                    <span className="text-sm">🍜</span>
                  </div>
                  <div className="absolute bottom-1/3 -right-4 w-8 h-8 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 animate-float-delayed">
                    <span className="text-sm">🍕</span>
                  </div>
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

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float 3s ease-in-out infinite 0.5s;
        }

        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradientShift 3s ease infinite;
        }
      `}</style>
    </section>
  );
}