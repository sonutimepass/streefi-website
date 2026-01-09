'use client';

import Link from 'next/link';

export default function MobileView() {
  return (
    <section className="relative from-green-600 to-teal-700 pt-12 pb-15 overflow-hidden min-h-[60vh]">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30"></div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
            Meet Our{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200">
              Street Food Heroes
            </span>
          </h1>
          <p className="text-sm text-white/90 max-w-xs mx-auto font-medium leading-relaxed">
            Discover authentic vendors who bring the best street food to your neighborhood
          </p>
        </div>
        
        <Link
          href="#vendors"
          className="inline-flex items-center gap-2 px-4 py-3 bg-white text-[#048a46] rounded-full font-bold hover:bg-gray-50 transition-all duration-200 shadow-lg active:scale-95 text-base"
        >
          <span>Explore Vendors</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Link>
      </div>
      <div className="absolute bottom-0 left-0 w-full">
        
      </div>
    </section>
  );
}