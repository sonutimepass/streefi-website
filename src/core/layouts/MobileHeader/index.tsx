'use client';
import Link from 'next/link';
import { useState, useEffect, memo } from 'react';
import { usePathname } from 'next/navigation';

function MobileHeader() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
        setMenuOpen(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-[999] bg-white border-b border-gray-200 shadow-sm transition-transform duration-500"
        style={{ 
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)'
        }}
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link 
              href="/" 
              className="font-bold text-2xl text-green-600 hover:text-green-700 transition-colors duration-200 "
            >
              Streefi
            </Link>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-gray-700 hover:text-green-600 transition-all duration-300"
              aria-label="Toggle menu"
            >
              <div className="relative w-6 h-5 flex flex-col justify-between">
                <span 
                  className={`w-full h-0.5 bg-current transform transition-all duration-300 origin-center ${
                    menuOpen ? 'rotate-45 translate-y-[9px]' : ''
                  }`}
                />
                <span 
                  className={`w-full h-0.5 bg-current transition-all duration-300 ${
                    menuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span 
                  className={`w-full h-0.5 bg-current transform transition-all duration-300 origin-center ${
                    menuOpen ? '-rotate-45 -translate-y-[9px]' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      <div 
        className={`md:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-[998] transition-all duration-300 ease-in-out overflow-hidden ${
          menuOpen ? 'max-h-80 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
        }`}
      >
        <nav className="flex flex-col p-4 space-y-3">
          <Link 
            href="/" 
            onClick={() => setMenuOpen(false)}
            className={`py-2 font-medium transition-colors duration-200 ${
              isActive('/') ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'
            }`}
          >
            Home
          </Link>
          <Link 
            href="/policies/policy" 
            onClick={() => setMenuOpen(false)}
            className={`py-2 font-medium transition-colors duration-200 ${
              isActive('/policies/policy') ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'
            }`}
          >
            Policies
          </Link>
          <Link 
            href="/support" 
            onClick={() => setMenuOpen(false)}
            className={`py-2 font-medium transition-colors duration-200 ${
              isActive('/support') ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'
            }`}
          >
            Support
          </Link>
          <Link 
            href="/vendor" 
            onClick={() => setMenuOpen(false)}
            className={`py-2 font-medium transition-colors duration-200 ${
              isActive('/vendor') ? 'text-green-600 font-semibold' : 'text-gray-700 hover:text-green-600'
            }`}
          >
            Vendor
          </Link>
        </nav>
      </div>
    </>
  );
}

export default memo(MobileHeader);
