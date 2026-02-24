'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  title: string;
  onLogout: () => void;
  isDev?: boolean;
}

export default function AdminHeader({ title, onLogout, isDev }: AdminHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo & Title */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/')}
                className="font-bold text-2xl text-green-600 hover:text-green-700 transition-colors duration-200"
              >
                Streefi
              </button>
              <span className="text-gray-400">|</span>
              <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
            </div>

            {/* Right: Navigation & Logout */}
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                🏠 Home
              </Link>
              <Link
                href="/support"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                💬 Support
              </Link>
              
              {/* Dev Mode Indicator */}
              {isDev && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                  🔓 DEV MODE
                </span>
              )}

              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-50 bg-white shadow-md">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button 
              onClick={() => router.push('/')}
              className="font-bold text-xl text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              Streefi
            </button>

            {/* Title (centered) */}
            <h1 className="text-sm font-semibold text-gray-800 absolute left-1/2 transform -translate-x-1/2">
              {title}
            </h1>

            {/* Hamburger Menu */}
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

        {/* Mobile Dropdown Menu */}
        <div 
          className={`bg-white border-t border-gray-200 shadow-lg transition-all duration-300 ease-in-out overflow-hidden ${
            menuOpen ? 'max-h-80 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
          }`}
        >
          <nav className="flex flex-col p-4 space-y-3">
            <Link 
              href="/" 
              onClick={() => setMenuOpen(false)}
              className="py-2 text-gray-700 hover:text-green-600 font-medium transition-colors duration-200"
            >
              🏠 Back to Home
            </Link>
            <Link 
              href="/support" 
              onClick={() => setMenuOpen(false)}
              className="py-2 text-gray-700 hover:text-green-600 font-medium transition-colors duration-200"
            >
              💬 Support
            </Link>
            
            {isDev && (
              <div className="py-2 px-3 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-md">
                🔓 Development Mode Active
              </div>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                onLogout();
              }}
              className="py-2 px-4 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors duration-200 text-center"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
    </>
  );
}
