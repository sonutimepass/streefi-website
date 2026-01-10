'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { MapPin, Star, TrendingUp } from 'lucide-react';

export default function MobileView() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section 
      id="hero-section-mobile" 
      className="relative min-h-[80vh] pt-24 pb-8 px-4 overflow-hidden" 
      style={{ background: 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 50%, #f0fdf4 100%)' }} 
      aria-label="Hero section"
    >
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-20 -left-20 w-64 h-64 bg-[#06c167]/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 -right-20 w-72 h-72 bg-emerald-300/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-green-200/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] z-0">
        <svg className="w-full h-full" width="100%" height="100%">
          <defs>
            <pattern id="grid-mobile" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-mobile)" />
        </svg>
      </div>

      {/* Content */}
      <div className="w-full max-w-lg mx-auto relative z-20">
        <div className="flex flex-col items-center justify-center gap-6">
          
          {/* Top Section - Text Content (Centered) */}
          <div className="w-full text-center space-y-5">
            
            {/* Badge with Icon */}
            <div className={`inline-block transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
              <div className="group relative text-sm font-bold bg-gradient-to-r from-[#06c167]/10 to-emerald-100/50 backdrop-blur-md border-2 border-[#06c167]/30 text-[#06c167] px-5 py-2.5 rounded-full shadow-lg shadow-[#06c167]/10 hover:shadow-xl hover:shadow-[#06c167]/20 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 animate-pulse" />
                  <span>India's #1 Street Food Finder App*</span>
                  <Star className="w-4 h-4 fill-[#06c167] animate-pulse" />
                </div>
                {/* Shine effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-shine"></div>
              </div>
            </div>

            {/* Main Headline with Gradient Animation */}
            <h1 className={`text-4xl sm:text-5xl font-bold text-black leading-tight transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Find Street Food
              <br />
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-[#06c167] to-emerald-600 animate-gradient">
                  Near You
                </span>{/* Moving Dot Decoration */}
<div className="absolute -bottom-2 left-0 w-full h-[2px] bg-gray-200 overflow-hidden rounded-full">
  <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-[#06c167] to-transparent animate-[slideAcross_2s_infinite_linear]"></div>
</div>
              </span>
            </h1>

            {/* Subtext */}
            <div className={`flex items-center justify-center gap-2 text-gray-700 text-base font-medium transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p>Discover authentic flavors in your neighborhood</p>
            </div>

            {/* Download Buttons */}
            <div className={`space-y-4 pt-2 transition-all duration-700 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <p className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Available on both platforms</p>
              
              <div className="flex flex-col gap-3 justify-center items-center w-full px-2">
                
                {/* App Store Button */}
                <a
                  href="https://apps.apple.com/in/app/streefi/id6747432924"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Streefi on the App Store"
                  className="group relative flex items-center justify-center space-x-3 bg-white/90 backdrop-blur-sm border-2 border-gray-200 hover:border-[#06c167] hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 text-gray-900 px-6 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-[#06c167]/30 transition-all duration-500 text-sm w-full max-w-[300px] transform hover:scale-105 hover:-translate-y-1"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#06c167]/0 via-[#06c167]/5 to-[#06c167]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <Image
                    src="/assets/appstore.svg"
                    alt="App Store"
                    width={28}
                    height={28}
                    className="w-7 h-7 transition-all duration-300 group-hover:scale-110 relative z-10"
                  />
                  <div className="text-left relative z-10">
                    <p className="text-xs text-gray-500 font-medium">Download on the</p>
                    <p className="text-base font-bold text-gray-900 group-hover:text-[#06c167] transition-colors">App Store</p>
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#06c167]/10 rounded-bl-2xl rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </a>

                {/* Google Play Button */}
                <a
                  href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download Streefi on Google Play"
                  className="group relative flex items-center justify-center space-x-3 bg-white/95 backdrop-blur-sm border-2 border-gray-200 hover:border-[#06c167] hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 text-gray-900 px-6 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-[#06c167]/30 transition-all duration-500 text-sm w-full max-w-[300px] transform hover:scale-105 hover:-translate-y-1"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#06c167]/0 via-[#06c167]/5 to-[#06c167]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <Image
                    src="/assets/playstore.svg"
                    alt="Google Play"
                    width={28}
                    height={28}
                    className="w-7 h-7 transition-all duration-300 group-hover:scale-110 relative z-10"
                  />
                  <div className="text-left relative z-10">
                    <p className="text-xs text-gray-500 font-medium">Get it on</p>
                    <p className="text-base font-bold text-gray-900 group-hover:text-[#06c167] transition-colors">Google Play</p>
                  </div>
                  
                  {/* Corner accent */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#06c167]/10 rounded-bl-2xl rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </a>
              </div>

              {/* Trust Badge */}
              <div className="flex items-center justify-center gap-2 pt-2">
                                <p className="text-xs text-gray-600 font-medium">
                  <span className="text-[#06c167] font-bold">1000+</span> happy foodies
                </p>
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
@keyframes slideAcross {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        @keyframes draw {
          0% {
            stroke-dasharray: 0 300;
          }
          100% {
            stroke-dasharray: 300 0;
          }
        }

        .animate-draw {
          stroke-dasharray: 300;
          animation: draw 2s ease-in-out infinite;
        }

        @keyframes shine {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .animate-shine {
          animation: shine 3s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}