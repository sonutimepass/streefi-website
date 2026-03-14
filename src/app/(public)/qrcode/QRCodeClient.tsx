'use client';

import { useEffect } from 'react';

const IOS_LINK = "https://apps.apple.com/in/app/streefi/id6747432924";
const ANDROID_LINK = "https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share";
const DESKTOP_LINK = "https://streefi.in";

type Platform = 'iOS' | 'Android' | 'Desktop';

export default function QRCodeClient() {
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

    // Fallback redirect to main site after 10 minutes
    const fallbackTimer = setTimeout(() => {
      window.location.replace(DESKTOP_LINK);
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearTimeout(fallbackTimer);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-800">Redirecting...</h1>
        <p className="text-gray-600 mt-2">Taking you to Streefi</p>
      </div>
    </div>
  );
}
