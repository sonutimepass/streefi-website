'use client';

import { useEffect } from 'react';

const IOS_LINK = "https://apps.apple.com/in/app/streefi/id6747432924";
const ANDROID_LINK = "https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share";
const DESKTOP_LINK = "https://streefi.in";

type Platform = 'iOS' | 'Android' | 'Desktop';

export default function QRRedirect() {
  useEffect(() => {
    const detectPlatformAndRedirect = () => {
      const ua = navigator.userAgent.toLowerCase();
      let platform: Platform = "Desktop";
      let target = DESKTOP_LINK;

      if (/iphone|ipad|ipod/.test(ua)) {
        platform = "iOS";
        target = IOS_LINK;
      } else if (/android/.test(ua)) {
        platform = "Android";
        target = ANDROID_LINK;
      }

      // Fire analytics using already-loaded scripts from layout
      if (typeof window !== 'undefined' && (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as typeof window & { gtag: (...args: unknown[]) => void }).gtag('event', 'qr_scan', {
          event_category: 'QR',
          event_label: platform,
          platform: platform,
        });
      }

      if (typeof window !== 'undefined' && (window as typeof window & { clarity?: (...args: unknown[]) => void }).clarity) {
        (window as typeof window & { clarity: (...args: unknown[]) => void }).clarity('set', 'qr_scan_platform', platform);
        (window as typeof window & { clarity: (...args: unknown[]) => void }).clarity('event', 'qr_redirect');
      }

      // INSTANT redirect
      window.location.replace(target);
    };

    detectPlatformAndRedirect();
  }, []);

  return (
    <>{/* Loading UI - The "Radar" */}
<div className="flex items-center justify-center min-h-screen bg-[#f0fdf4] relative overflow-hidden">
  {/* Background decorative blob */}
  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#06c167]/5 rounded-full blur-3xl"></div>

  <div className="text-center relative z-10">
    <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-6">
      {/* Outer Ripple */}
      <div className="absolute inset-0 bg-[#06c167]/20 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
      {/* Inner Ripple (Delayed) */}
      <div className="absolute inset-2 bg-[#06c167]/30 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite_0.4s]"></div>
      
      {/* Center Icon (Map Pin) */}
      <div className="relative bg-white p-3 rounded-full shadow-lg shadow-[#06c167]/20 border border-[#06c167]/10 animate-bounce">
        <svg 
          className="w-6 h-6 text-[#06c167]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
    </div>

    <h3 className="text-gray-900 text-xl font-bold tracking-tight">Hang tight!</h3>
    <p className="text-[#06c167] text-sm font-medium mt-1 animate-pulse">Redirecting you to the spot...</p>
  </div>
</div>
    </>
  );
}
