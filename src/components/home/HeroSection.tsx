'use client';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(
  () => import('@/components/common/ParticleBackground'),
  { ssr: false }
);

export default function HeroSection() {
  return (
    <section className="relative pt-22 md:pt-28 pb-8 px-6 bg-black overflow-hidden" aria-label="Hero section">
      {/* Background Image */}
      <div className="absolute inset-0 opacity-50 z-0" aria-hidden="true">
        <Image
          src="/assets/qwerty.png"
          alt="Street Food Background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
      </div>

      {/* Particle Effect - Above background image, below content */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <ParticleBackground
          particleColor="#ffffff"
          particleCount={800}
          speed={1.5}
        />
      </div>

      {/* Video Background */}
      {/* <div className="absolute inset-0 opacity-70">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/assets/background-video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div> */}



      {/* Grid lines animation */}
      <div className="absolute inset-0 opacity-5 z-5">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-emerald-400" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto relative z-20 pt-30">
        <div className="flex flex-col items-center text-center">
          {/* Content - Centered */}
          <div className="space-y-6 pt-8 max-w-10xl"> <div className="pt-14"></div>
            {/* Badge */}
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-[#06c167]/20 backdrop-blur-sm border border-[#06c167]/30 text-[#06c167] px-6 py-3 rounded-full inline-block">
              India's #1 Street Food Finder App*
            </div>
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl font-bold text-gray-100 leading-tight">
              <span>
                Find Street Food Near You
              </span>
            </h1>
            {/* Scroll Down Indicator */}
            <div className="flex justify-center -mt-2">
              <button
                onClick={() => window.scrollBy({ top: 400, behavior: 'smooth' })}
                className="flex items-center gap-1 animate-bounce hover:scale-110 transition-transform cursor-pointer"
                aria-label="Swipe down"
              >
                <span className="text-white text-xs font-medium tracking-wider">SWIPE DOWN</span>
                <svg className="w-5 h-5 text-[#06c167]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>

            {/* Download Buttons */}
            <div className="space-y-4">
              <p className="text-white text-base font-medium">Available on both platforms</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href="https://apps.apple.com/in/app/streefi/id6747432924"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Streefi on the App Store"
                  className="relative flex items-center justify-center space-x-3 bg-white backdrop-blur-sm border-2 border-[#06c167] hover:bg-[#06c167] hover:border-[#06c167] text-gray-900 hover:text-white px-6 py-4 rounded-xl shadow-lg transition-all duration-500 hover:scale-105 group text-base min-w-[200px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Image
                    src="/assets/appstore.svg"
                    alt="App Store"
                    width={24}
                    height={24}
                    className="w-6 h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 relative z-10"
                  />
                  <div className="text-center relative z-10">
                    <p className="text-sm text-gray-600 group-hover:text-white transition-colors">Download on the</p>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors">App Store</p>
                  </div>
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Streefi on Google Play"
                  className="relative flex items-center justify-center space-x-3 bg-white backdrop-blur-sm border-2 border-[#06c167] hover:bg-[#06c167] hover:border-[#06c167] text-gray-900 hover:text-white px-6 py-4 rounded-xl shadow-lg transition-all duration-500 hover:scale-105 group text-base min-w-[200px]"
                  style={{ touchAction: 'manipulation' }}
                >
                  <Image
                    src="/assets/playstore.svg"
                    alt="Google Play"
                    width={24}
                    height={24}
                    className="w-6 h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 relative z-10"
                  />
                  <div className="text-center relative z-10">
                    <p className="text-sm text-gray-600 group-hover:text-white transition-colors">Get it on</p>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-white transition-colors">Google Play</p>
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
