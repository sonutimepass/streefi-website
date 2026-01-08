'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const screenshots = [
  '/assets/screenshots/screen1.webp',
  '/assets/screenshots/screen2.webp',
  '/assets/screenshots/screen3.webp',
  '/assets/screenshots/screen4.webp',
];

export default function MobileView() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-swipe screenshots
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % screenshots.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="phone-mockup-section" className="relative py-12 px-4 overflow-hidden bg-[#f0fdf4]" aria-label="App Preview">
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-black mb-3">
            Experience the App
          </h2>
          <p className="text-gray-600 text-base max-w-md mx-auto">
            Discover street food vendors near you with our beautifully designed app
          </p>
        </div>

        {/* Phone Mockup */}
        <div className="w-full flex justify-center">
          <div className="relative flex items-center justify-center">
            <div className="relative w-[180px] sm:w-[200px]">
              {/* Phone Shadow */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-12 bg-gradient-to-t from-[#06c167]/40 to-transparent blur-2xl"></div>
              
              {/* Phone Frame */}
              <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-2.5 shadow-2xl shadow-black/50 border border-gray-700">
                {/* Screen Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-800 rounded-b-xl z-10"></div>
                
                {/* Screen Content */}
                <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-[2rem] overflow-hidden aspect-[9/19] border border-gray-800">
                  {/* App Screenshots Carousel */}
                  {screenshots.map((src, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                        index === currentIndex 
                          ? 'opacity-100 scale-100' 
                          : 'opacity-0 scale-95'
                      }`}
                    >
                      <Image
                        src={src}
                        alt={`Streefi App Screenshot ${index + 1}`}
                        fill
                        loading={index === 0 ? 'eager' : 'lazy'}
                        className="object-cover object-top"
                        sizes="200px"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {screenshots.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-[#06c167] w-5' 
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Go to screenshot ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
