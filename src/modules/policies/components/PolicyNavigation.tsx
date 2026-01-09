'use client';
import { useEffect, useState } from 'react';

export default function PolicyNavigation() {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);
  const [showDesktopNav, setShowDesktopNav] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      setShowScrollTop(scrollTop > 300);
      setShowScrollBottom(scrollTop + windowHeight < documentHeight - 300);

      // Check if footer is visible for desktop navigation
      const footer = document.querySelector('footer');
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        const isFooterVisible = footerRect.top < windowHeight;
        setShowDesktopNav(!isFooterVisible);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const links = [
    
    { id: 'privacy', label: 'Privacy' },
    { id: 'terms', label: 'Terms' },
    { id: 'refund', label: 'Refund' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'cookies', label: 'Cookies' },
    { id: 'security', label: 'Security' },
    { id: 'vendor', label: 'Vendor' },
    { id: 'customer', label: 'Customer' },
    { id: 'promotion', label: 'Promotion' },
    { id: 'rating', label: 'Rating' },
    { id: 'wishlist', label: 'Wishlist' },
    { id: 'dineinpolicy', label: 'Dine-In' }
  ];

  return (
    <>
      {/* Sticky Sidebar Navigation - Desktop */}
      {showDesktopNav && (
        <div className="hidden lg:block fixed right-0 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300">
          <div className="bg-gray-50 shadow-2xl rounded-l-2xl overflow-hidden ">
            <div className="flex flex-col">
            {links.map((link, index) => (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                className="group relative px-8 py-3 text-black text-sm font-medium hover:bg-green-600 transition-all duration-300 border-b border-gray-200 last:border-b-0 whitespace-nowrap overflow-hidden"
                style={{
                  animationDelay: `${index * 0.05}s`
                }}
              >
                {/* Left arrow on hover */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2 transition-all duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </span>
                
                {/* Icon */}
                <span className="relative flex items-center justify-center gap-3">
                  <span className="group-hover:-translate-x-1 transition-transform duration-300">{link.label}</span>
                  <span className="w-2 h-2 bg-black rounded-full group-hover:scale-150 transition-all duration-300"></span>
                </span>
                
                {/* Right dot spacer */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4"></span>
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Mobile Sticky Top Navigation */}
      <div className="block lg:hidden bg-gray-50 sticky top-0 z-30 shadow-lg">
        <div className="relative max-w-4xl mx-auto px-4 py-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth w-full">
            {links.map((link) => (
              <button 
                key={link.id} 
                onClick={() => scrollToSection(link.id)}
                className="group relative px-4 py-2 text-white text-sm font-medium whitespace-nowrap rounded-full bg-[#06c167] transition-all duration-300 border border-[#06c167] hover:bg-[#059669]"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-0 bg-white/50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Buttons - Mobile Only */}
      <div className="block lg:hidden">
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 active:bg-green-800 transition-all duration-300 z-50"
            aria-label="Scroll to top"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}

        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-6 right-4 bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 active:bg-green-800 transition-all duration-300 z-50"
            aria-label="Scroll to bottom"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
